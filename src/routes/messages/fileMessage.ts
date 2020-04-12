
import busboy from 'connect-busboy';
import path from 'path';
import fs from 'fs';
import * as nertiviaCDN from '../../utils/uploadCDN/nertiviaCDN';
import  uploadGoogleDrive from '../../utils/uploadCDN/googleDrive';
import sharp from 'sharp';
import {Request, Response, NextFunction} from 'express';
const oauth2Client = require('./../../middlewares/GDriveOauthClient')
const FlakeId = require('flakeid');
const flakeId = new FlakeId(); 

export default async (req: Request, res: Response, next: NextFunction) => {
  // if formdata doesnt exist, go to the next function.
  if (!req.headers["content-type"]?.startsWith('multipart/form-data')) return next();
  // start getting file stream;
  busboy({immediate: true})(req, res, () => {}) // empty function to stop next() from executing.

  let message: string;
  let upload_cdn: number; // 0: google drive 1: nertivia cdn

  req.busboy.on("error", function(err:any) {
    req.unpipe(req.busboy);
    console.error(err)
    return res.status(403).json({message: 'Something went wrong while trying to upload.'})
  })

  req.busboy.on('field', (fieldname, val) => {
    if (fieldname === 'message') {
      if (val.length > 5000) {
        req.unpipe(req.busboy);
        return res.status(403).json({
          status: false,
          message: "Message must contain characters less than 5,000"
        });
      }
      message = val;
    }
    if (fieldname === 'upload_cdn') {
      upload_cdn = parseInt(val);
    }
  })
  req.busboy.on("file", async (fieldname, file, filename, encoding, mimetype ) => {
    if (fieldname !== 'file'){
      req.unpipe(req.busboy);
      return res.status(403).json({message: 'Use field name of "file" to upload files.'})
    }

    file.on("error",  function(err) {
      req.unpipe(req.busboy);
      console.error(err)
      return res.status(403).json({message: 'Something went wrong while trying to upload.'})
    })

    if (upload_cdn === undefined) {
      req.unpipe(req.busboy);
      return res.status(403).json({message: 'upload_cdn is missing or ordered incorrectly.'})
    }

    // get image dimentions by getting the first buffer.
    let chunks: Buffer[] = [];
    let metadata: sharp.Metadata;
    if (isImage(filename, mimetype )) file.on("data", onData);
    async function onData(chunk: any) {
      if (chunks.length === 0) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      if (metadata) return;
      metadata = await sharp(buffer).metadata();
      file.removeListener("data", onData);
    }

    const fileid = flakeId.gen();
    const dirPath = path.join(__dirname, "../", "../", "public", "temp", fileid);

    // temporarly store file in server.
    const writeStream = fs.createWriteStream(dirPath);
    file.pipe(writeStream);

    // Upload to Google Drive
    if (upload_cdn === 0) {
      oauth2Client(req, res, () => {});

      writeStream.once("close", async () => {
        const data:any = await uploadGoogleDrive({
          file: {
            fileName: filename,
            dirPath: dirPath,
            mimeType: mimetype
          },
          oauth2Client: req.oauth2Client
        }).catch(_ => {res.status(403).json({message: "Something went wrong while uploading to Google Drive."})})
        if (!data) return deleteFile(dirPath);
        const fileObj: {fileName: string, fileID: string, dimensions?: object} = {
          fileName: filename,
          fileID: data.data.id
        };
        if (metadata){
          fileObj.dimensions = { width: metadata.width, height: metadata.height };
        }
        req.uploadFile = {file: fileObj, message}
        next()
        // delete local file after job is done.
        deleteFile(dirPath);
        
      })
      

    }
    // Upload to Nertivia CDN
    if (upload_cdn === 1) {
      // wait untill the write is finished and then upload.
      writeStream.once("close", async () => {
        const success = await nertiviaCDN.uploadFile(dirPath, req.user.uniqueID, fileid, filename)
          .catch((err:any) => {res.status(403).json({message: err})})
        if (!success) return deleteFile(dirPath);
        const fileObj: {url: string, dimensions?: object} = {
          url: `https://nertivia-media.tk/${req.user.uniqueID}/${fileid}/${encodeURIComponent(filename)}`
        };
        if (metadata){
          fileObj.dimensions = { width: metadata.width, height: metadata.height };
        }
        req.uploadFile = {file: fileObj, message}
        next()
        // delete local file after job is done.
        deleteFile(dirPath);
      })
    }

  })
}

function deleteFile(path:string) {
  fs.unlink(path, err => {
    if (err) console.error(err)
  });
}

function isImage(fileName: string, mimeType: string ) {
  const filetypes = /jpeg|jpg|gif|png/;
  const mimeTypeTest = filetypes.test(mimeType);
  const extname = filetypes.test(path.extname(fileName).toLowerCase());
  if (mimeTypeTest && extname) {
    return true;
  }
  return false;
}
