
import busboy from 'connect-busboy';
import path from 'path';
import fs from 'fs';
import * as nertiviaCDN from '../../utils/uploadCDN/nertiviaCDN';
import uploadGoogleDrive from '../../utils/uploadCDN/googleDrive';
import sharp from 'sharp';
import gm from 'gm';
const gmInstance = gm.subClass({ imageMagick: true });
import { Request, Response, NextFunction } from 'express';
import { GDriveOauthClient } from '../../middlewares/GDriveOauthClient';
import flake from '../../utils/genFlakeId'
import compressImage from '../../utils/compressImage';
import tempSaveImage from '../../utils/tempSaveImage';

export default async (req: Request, res: Response, next: NextFunction) => {
  let cancelRequest = false;
  // if formdata doesnt exist, go to the next function.
  if (!req.headers["content-type"]?.startsWith('multipart/form-data')) return next();
  // file size limit
  const filesize = parseInt(req.headers['content-length'] || "0");
  const file_limit = 57670000; // 55MB
  if (filesize > file_limit) {
    return res.status(403).json({ message: '50MB file or below.' })
  }

  // start getting file stream;
  busboy({ immediate: true })(req, res, () => { }) // empty function to stop next() from executing.

  let message: string;
  let upload_cdn: number; // 0: google drive 1: nertivia cdn
  let compress: number = 0; // 0: dont compress 1: compress

  req.busboy.on("error", function (err: any) {
    cancelRequest = true;
    req.unpipe(req.busboy);
    return res.status(403).json({ message: 'Something went wrong while trying to upload.' })
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
    if (fieldname === 'compress') {
      compress = parseInt(val) || 0;
    }
  })
  req.busboy.on("file", async (name, stream, info) => {
    if (name !== 'file') {
      req.unpipe(req.busboy);
      return res.status(403).json({ message: 'Use field name of "file" to upload files.' })
    }

    stream.on("error", function (err) {
      if (cancelRequest) return;
      cancelRequest = true;
      req.unpipe(req.busboy);
      return res.status(403).json({ message: 'Something went wrong while trying to upload.' })
    })

    if (upload_cdn === undefined) {
      req.unpipe(req.busboy);
      return res.status(403).json({ message: 'upload_cdn is missing or ordered incorrectly.' })
    }

    // get image dimentions
    let metadata: sharp.Metadata | undefined = undefined;


    // temporarly store file in server.
    let { dirPath, fileid } = await tempSaveImage(info.filename, stream);


    if (isImage(info.filename, info.mimeType)) {
      if (compress) {

        dirPath = (await compressImage(info.filename, dirPath)
          .catch(() => { res.status(403).json({ message: "Failed to compress image." }) })) || "";
        if (!dirPath) return;

      }
      metadata = await sharp(dirPath).metadata();
    }


    // Upload to Google Drive
    if (upload_cdn === 0) {
      GDriveOauthClient(req, res, () => { });
      if (cancelRequest) return;
      const data: any = await uploadGoogleDrive({
        fileName: info.filename,
        dirPath: dirPath,
        mimeType: info.mimeType,
        oauth2Client: req.oauth2Client
      }).catch(_ => { res.status(403).json({ message: "Something went wrong while uploading to Google Drive." }) })
      if (!data) return deleteFile(dirPath);
      const fileObj: { fileName: string, fileID: string, dimensions?: object } = {
        fileName: info.filename,
        fileID: data.data.id
      };
      if (metadata) {
        fileObj.dimensions = { width: metadata.width, height: metadata.height };
      }
      req.uploadFile = { file: fileObj, message }
      next()
      // delete local file after job is done.
      deleteFile(dirPath);
    }
    // Upload to Nertivia CDN
    if (upload_cdn === 1) {

      if (cancelRequest) return;
      const error = await nertiviaCDN.uploadFile(fs.createReadStream(dirPath), req.user.id, fileid, info.filename)
      if (error) {
        res.status(403).json({ message: error })
        return deleteFile(dirPath);
      }
      const fileObj: { url: string, dimensions?: object } = {
        url: `https://media.nertivia.net/${req.user.id}/${fileid}/${encodeURIComponent(info.filename)}`
      };
      if (metadata) {
        fileObj.dimensions = { width: metadata.width, height: metadata.height };
      }
      req.uploadFile = { file: fileObj, message }
      next()
      // delete local file after job is done.
      deleteFile(dirPath);
    }

  })
}

function deleteFile(path: string) {
  fs.unlink(path, err => {
    if (err) console.error(err)
  });
}

function isImage(fileName: string, mimeType: string) {
  const filetypes = /jpeg|jpg|gif|png|webp/;
  const mimeTypeTest = filetypes.test(mimeType);
  const extname = filetypes.test(path.extname(fileName).toLowerCase());
  if (mimeTypeTest && extname) {
    return true;
  }
  return false;
}

function renameAsync(oldDir: string, newDir: string) {
  return new Promise((res, rej) => {
    fs.rename(oldDir, newDir, err => {
      if (err) return rej(err);
      res(true);
    })
  })
}