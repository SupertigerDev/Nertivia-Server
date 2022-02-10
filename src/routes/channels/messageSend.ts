import { Request, Response, Router } from 'express';

import { authenticate } from '../../middlewares/authenticate';
import channelRateLimit from '../../middlewares/channelRateLimit';
import { channelVerification } from '../../middlewares/ChannelVerification';
import checkRolePermissions from '../../middlewares/checkRolePermissions';
import disAllowBlockedUser from '../../middlewares/disAllowBlockedUser';
import rateLimit from '../../middlewares/rateLimit';

import messagePolicy from '../../policies/messagePolicies';
import serverChannelPermissions from '../../middlewares/serverChannelPermissions'
import permissions from '../../utils/rolePermConstants';
import connectBusboy from 'connect-busboy';
import { Log } from '../../Log';
import { Readable } from 'form-data';
import { getImageDimensions, ImageDimension, isImageMime } from '../../utils/image';
import { deleteFile, saveTempFile } from '../../utils/file';
import compressImage from '../../utils/compressImage';
import { GDriveOauthClient } from '../../middlewares/GDriveOauthClient';
import uploadGoogleDrive from '../../utils/uploadCDN/googleDrive';
import * as nertiviaCDN from '../../utils/uploadCDN/nertiviaCDN';
import fs from 'fs';
import { createMessage, CreateMessageArgs } from '../../services/Messages';

export const messageSend = (Router: Router) => {
  Router.route("/:channelId/messages/").post(
    authenticate(true),
    messagePolicy.post,
    rateLimit({name: 'message_send', expire: 20, requestsLimit: 15 }),
    channelVerification,
    channelRateLimit,
    disAllowBlockedUser,
    serverChannelPermissions('send_message', true),
    checkRolePermissions('Send Message', permissions.roles.SEND_MESSAGES),
    connectBusboy({limits: {
      fileSize: 57670000, // 55MB
      fields: 5,
      files: 1
    }}),
    route
  );
}

interface Body {
  tempID?: string, 
  socketID?: string, 
  buttons: any[], 
  htmlEmbed: any, 
  // TODO: rename this to "content" (also in db)
  message: string
}

async function route (req: Request, res: Response){

  const body = req.body as Body;
  const isFileMessage = req.busboy;

  const args: Partial<CreateMessageArgs> = {
    channel: req.channel,
    creator: req.user,
    socketId: body.socketID,
    tempId: body.tempID,
  }
  
  if (isFileMessage) {
    const [fileMessage, error] = await handleFile(req, res);
    if (error || !fileMessage) {
      return res.status(403).send({message: error});
    }
    const {message, file} = fileMessage;
    args.content = message;
    args.file = file;
  }
  
  args.htmlEmbed = body.htmlEmbed;
  args.buttons = body.buttons;
  args.content = body.message;
  
  const message = await createMessage(args as CreateMessageArgs).catch(err => {
    console.log(err);
    return res.status(err.statusCode).send({message: err.message});
  })
  if (!message) return;
  res.json({...message, tempID: body.tempID});
};



enum CDN {
  GOOGLE_DRIVE = 0,
  NERTIVIA_CDN = 1 
}
interface FormData {
  message: null | string;
  uploadCdn: null | CDN;
  compress: null | number;
}

const handleFile = (req: Request, res: Response): Promise<[null | any, null | string]> => new Promise(resolve => {
  if (!req.busboy) {
    resolve([null, null])
    return;
  }
  const formData: FormData = {
    message: null,
    uploadCdn: null,
    compress: null
}
  
  req.busboy.on("field", (field, value) => {
    if (field === 'message') {
      if (value.length > 5000) {
        req.unpipe(req.busboy);
        return resolve([null, "Message must contain characters less than 5,000"]);
      }
      formData.message = value;
    }
    if (field === 'upload_cdn') formData.uploadCdn = parseInt(value);
    if (field === 'compress') formData.compress = parseInt(value) || 0;
  })

  req.busboy.on("file", async (name, stream, info) => {
    if (name !== "file") {
      req.unpipe(req.busboy);
      return resolve([null, "File field name must be 'file'."]);
    }
    if (formData.uploadCdn === null) {
      req.unpipe(req.busboy);
      return resolve([null, "upload_cdn is missing or ordered incorrectly."])
    }
    // save image to storage temporarily.
    const [tempFile, err] = await saveTempFile(stream, info.filename);
    req.unpipe(req.busboy);
    if (err || !tempFile) {
      return resolve([null, err]);
    }
    let {fileId, filePath} = tempFile;

    const isImage = isImageMime(info.mimeType);
    let imageDimensions: ImageDimension | null = null;

    if (isImage) {
      const [imageDetails, imageError] = await handleImageFile(info.filename, filePath, formData.compress);
      if (imageError || !imageDetails) return resolve([null, imageError]);
      filePath = imageDetails.newFilePath;
      imageDimensions = imageDetails.imageDimensions;
    }
    const [file, uploadError] = await uploadFile(req, res, {
      fileId,
      userId: req.user.id,
      cdn: formData.uploadCdn,
      fileName: info.filename,
      mimeType: info.mimeType,
      filePath: filePath,
      dimensions: imageDimensions
    })
    if (uploadError || !file) return resolve([null, uploadError]);
    return resolve([{message: formData.message, file}, null])
  })

  req.pipe(req.busboy)
});



interface ImageDetails {
  newFilePath: string;
  imageDimensions: ImageDimension
}

// compress image / get image dimensions.
async function handleImageFile(fileName: string, filePath: string, compress: boolean | number | null): Promise<[ImageDetails | null, string | null]> {
  let newFilePath = filePath;
  let imageDimensions: ImageDimension | undefined;
  // compress image
  if (compress) {
    const compressedFilePath = await compressImage(fileName, filePath).catch(() => {})
    if (!compressedFilePath) {
      deleteFile(filePath);
      return [null, "Failed to compress image."];
    }
    newFilePath = compressedFilePath;
  }

  // get image dimensions.
  const dimensions = await getImageDimensions(filePath).catch(() => {});
  if (!dimensions) {
    deleteFile(filePath);
    return [null, "Failed to get image dimensions."];
  }
  imageDimensions = dimensions;
  return [{newFilePath, imageDimensions}, null];
}




interface UploadFile {
  cdn: CDN
  fileName: string;
  filePath: string;
  mimeType: string;
  userId: string;
  fileId: string;
  dimensions?: ImageDimension | null;
} 

function uploadFile(req: Request, res: Response, uploadFile: UploadFile) {
  if (uploadFile.cdn === CDN.GOOGLE_DRIVE) {
    return uploadFileGoogleDrive(req, res, uploadFile);
  }
  if (uploadFile.cdn === CDN.NERTIVIA_CDN) {
    return uploadFileNertiviaCDN(uploadFile);
  }
  return [null, "Invalid CDN provided."]
}
async function uploadFileGoogleDrive(req: Request, res: Response, uploadFile: UploadFile): Promise<[any, string | null]> {
  await GDriveOauthClient(req, res, () => {});

  const file = await uploadGoogleDrive({
    fileName: uploadFile.fileName,
    dirPath: uploadFile.filePath,
    mimeType: uploadFile.mimeType,
    oAuth2Client: req.oAuth2Client
  }).catch(() => {})

  if (!file?.data.id) return [null, "Something went wrong when uploading to google drive."];

  return [{
    fileName: uploadFile.fileName,
    fileID: file.data.id,
    ...(uploadFile.dimensions && {dimensions: uploadFile.dimensions})
  }, null];

}
async function uploadFileNertiviaCDN(uploadFile: UploadFile): Promise<[any, string | null]> {
  const stream = fs.createReadStream(uploadFile.filePath);
  const error = await nertiviaCDN.uploadFile(stream, uploadFile.userId, uploadFile.fileId, uploadFile.fileName)
  if (error) return [null, error];

  return [{
    url: `https://media.nertivia.net/${uploadFile.userId}/${uploadFile.fileId}/${encodeURIComponent(uploadFile.fileName)}`,
    ...(uploadFile.dimensions && {dimensions: uploadFile.dimensions})
  }, null]
}