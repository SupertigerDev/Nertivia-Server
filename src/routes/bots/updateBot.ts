import { Request, Response } from "express";
import {Users} from '../../models/Users';
import { matchedData } from "express-validator";
import {cropImage} from "../../utils/cropImage";
import * as nertiviaCDN from '../../utils/uploadCDN/nertiviaCDN'
import { USER_UPDATED } from "../../ServerEventNames";
const emitToAll = require("../../socketController/emitToAll");
const flakeId = new (require('flakeid'))();

export default async function updateBot(req: Request, res: Response) {
  const { bot_id } = req.params;

  const bot = await Users.findOne({createdBy: req.user._id, id: bot_id}).select("avatar bot created tag id username").lean();
  if (!bot) {
    res.status(403).json({message: "Could not find bot."})
    return;
  }
  const data = matchedData(req);

   // check if tag + username already exists 
   if (data.username || data.tag) {
    const userTagExists = await Users.exists({
      username: data.username || (bot as any).username,
      tag: data.tag || (bot as any).tag,
      id: { $ne: (bot as any).id }
    });
    if (userTagExists) {
      return res.status(403).json({
        errors: [
          { param: "tag", msg: "Username with that tag is already used." }
        ]
      });
    }
  }

  if (data.avatar) {
    const url = await uploadAvatar(data.avatar, req.user.id).catch(err => {res.status(403).json({message: err})});
    if (!url) return;
    delete data.avatar;
    data.avatar = url;
  }

  let error = false
  await Users.updateOne({ _id: bot._id }, data).catch((err: any) => { error = true });
  if (error) {
    res.status(403).json({message: "Something went wrong while storing to database."})
    return;
  }
  data.id = (bot as any).id;
  
  req.io.in((bot as any).id).emit(USER_UPDATED, data);
  emitToAll(USER_UPDATED, bot._id, data, req.io, false);
  res.json(data);

}

async function uploadAvatar(base64: string, user_id: string) {
  return new Promise(async (resolve, reject) => {
    let buffer: Buffer | undefined = Buffer.from(base64.split(',')[1], 'base64');

    // 8092000 = 8mb
    const maxSize = 8092000; 
    if (buffer.byteLength > maxSize) {
      return reject("Image is larger than 8MB.")

    }
    const mimeType = base64MimeType(base64);
    const type = base64.split(';')[0].split('/')[1];
    if (!mimeType || !checkMimeType(mimeType!!)) {
      return reject("Invalid avatar.")
    }

    buffer = await cropImage(buffer, mimeType, 200);

    if (!buffer) {
      return reject("Something went wrong while cropping image.")
    }
    const id = flakeId.gen();


    const success = await nertiviaCDN.uploadFile(buffer, user_id, id, `avatar.${type}`)
      .catch(err => {reject(err)})
    if (!success) return;
    resolve(`${user_id}/${id}/avatar.${type}`);
  })
}



function base64MimeType(encoded: string) {
  var result = null;

  if (typeof encoded !== 'string') {
    return result;
  }

  var mime = encoded.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);

  if (mime && mime.length) {
    result = mime[1];
  }

  return result;
}

function checkMimeType(mimeType: string) {
  const filetypes = /jpeg|jpg|gif|png/;
  const mime = filetypes.test(mimeType);
  if (mime) {
    return true;
  }
  return false;
}