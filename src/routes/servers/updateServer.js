import {Servers} from "../../models/Servers";
import {Channels} from "../../models/Channels";

import * as NertiviaCDN from '../../common/NertiviaCDN';
import tempSaveImage from '../../utils/tempSaveImage';
import compressImage from '../../utils/compressImage';
import fs from 'fs';
import * as ServerCache from '../../cache/Server.cache';

const { matchedData } = require("express-validator");
const flake = require('../../utils/genFlakeId').default;
import {cropImage} from '../../utils/cropImage'
import { SERVER_UPDATED } from "../../ServerEventNames";
import { base64MimeType, isImageMime } from "../../utils/image";
import { deleteFile } from "../../utils/file";

module.exports = async (req, res, next) => {
  // check if this function is executed by the guild owner.
  if (req.server.creator !== req.user._id)
    return res
      .status(403)
      .json({ message: "You do not have permission to update this server!" });

  const oAuth2Client = req.oAuth2Client;
  // filtered data
  const data = matchedData(req);
  if (data && data.default_channel_id) {
    // check if channel id is in the server
    const checkChannel = await Channels.findOne({
      channelId: data.default_channel_id,
      server: req.server._id
    });
    if (!checkChannel) {
      return res
        .status(404)
        .json({ message: "Channel ID does not exist in your server." });
    }
  }


  if (data.avatar) {
    const url = await uploadAvatar(data.avatar, req.user.id, false).catch(err => { res.status(403).json({ message: err }) });
    if (!url) return;
    delete data.avatar;
    data.avatar = url;
  }


  if (data.banner) {
    const url = await uploadAvatar(data.banner, req.user.id, true).catch(err => { res.status(403).json({ message: err }) });
    if (!url) return;
    delete data.banner;
    data.banner = url;
  }


  const server = req.server;
  try {
    await Servers.updateOne({ server_id: server.server_id }, data);
    const io = req.io;
    io.in("server:" + req.server.server_id).emit(
      SERVER_UPDATED,
      Object.assign(data, { server_id: server.server_id })
    );
    // clear cache
    await ServerCache.deleteServer(server.server_id)
    res.json(Object.assign(data, { server_id: server.server_id }));
  } catch (e) {
    res.status(403).json({ message: "Something went wrong. Try again later." });
  }
};


async function uploadAvatar(base64, user_id, isBanner) {
  return new Promise(async (resolve, reject) => {
    let buffer = Buffer.from(base64.split(',')[1], 'base64');

    // 8092000 = 8mb
    const maxSize = 8092000;
    if (buffer.byteLength > maxSize) {
      return reject("Image is larger than 8MB.")

    }
    const mimeType = base64MimeType(base64);
    let type = base64.split(';')[0].split('/')[1];
    if (!isImageMime(mimeType)) {
      return reject("Invalid image.")

    }

    let dirPath = "";
    if (isBanner) {
      // buffer = await cropImage(buffer, mimeType, 500);
      // TODO: ADD ERROR HANDLING
      // DELETE TEMP FILE
      dirPath = (await tempSaveImage(`bnr.${type}`, buffer)).dirPath;
      dirPath = await compressImage(`bnr.${type}`, dirPath).catch(err => { reject("Something went wrong while compressing image.") })
      if (!dirPath) return;
      buffer = fs.createReadStream(dirPath);
    } else {
      buffer = await cropImage(buffer, mimeType, 200);
    }

    if (!buffer) {
      if (isBanner) deleteFile(dirPath);
      return reject("Something went wrong while compressing image.")
    }
    const id = flake.gen();
    const name = isBanner ? 'bnr' : 'avatar';

    if (isBanner && type !== "gif") {
      type = "webp"
    }

    const [filePath, error] = await NertiviaCDN.uploadFile({
      file: buffer,
      userId: user_id,
      fileName: `${name}.${type}`
    })
    if (isBanner) deleteFile(dirPath);
    if (error) {
      reject(error);
      return
    };
    resolve(filePath);
  })
}