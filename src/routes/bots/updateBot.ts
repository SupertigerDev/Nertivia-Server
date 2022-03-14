import { Request, Response } from "express";
import {Users} from '../../models/Users';
import { matchedData } from "express-validator";
import {cropImage} from "../../utils/cropImage";
import * as NertiviaCDN from '../../common/NertiviaCDN'
import { USER_UPDATED } from "../../ServerEventNames";
import { base64MimeType, isImageMime } from "../../utils/image";
import { emitToFriendsAndServers } from "../../socket/socket";

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
  
  emitToFriendsAndServers({
    event: USER_UPDATED,
    data,
    userObjectId: bot._id,
  })
  res.json(data);

}

async function uploadAvatar(base64: string, userId: string) {
  return new Promise(async (resolve, reject) => {
    let buffer: Buffer | undefined = Buffer.from(base64.split(',')[1], 'base64');

    // 8092000 = 8mb
    const maxSize = 8092000; 
    if (buffer.byteLength > maxSize) {
      return reject("Image is larger than 8MB.")

    }
    const mimeType = base64MimeType(base64);
    const ext = base64.split(';')[0].split('/')[1];
    if (!mimeType || !isImageMime(mimeType!!)) {
      return reject("Invalid avatar.")
    }

    buffer = await cropImage(buffer, mimeType, 200);

    if (!buffer) {
      return reject("Something went wrong while cropping image.")
    }

    const [filePath, error] = await NertiviaCDN.uploadFile({
      file: buffer,
      userId,
      fileName: `avatar.${ext}`
    })
    if (error) return reject(error);
    resolve(filePath);
  })
}
