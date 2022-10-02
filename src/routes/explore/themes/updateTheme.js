const Express = require("express");
import {Themes} from '../../../models/Themes';

import {PublicThemes} from '../../../models/PublicThemes'

const { matchedData } = require("express-validator");

import * as NertiviaCDN from '../../../common/NertiviaCDN'
import fs from 'fs';

import tempSaveImage from '../../../utils/tempSaveImage';
import compressImage from '../../../utils/compressImage';
import { base64MimeType, isImageMime } from '../../../utils/image';
import { deleteFile } from '../../../utils/file';


/** @type {Express.RequestHandler} */
module.exports = async (req, res, next) => {
  const oAuth2Client = req.oAuth2Client;
  const themeID = req.params.id;
  let data = matchedData(req);

  // check if theme exists
  const theme = await Themes.findOne({id: themeID, creator: req.user._id});
  data.compatible_client_version = theme.client_version;
  if (!theme) {
    return res.status(404).json({message: 'id is invalid.'});
  }
  // check if public theme exists.
  const publicTheme = await PublicThemes.findOne({theme: theme._id});
  if (!publicTheme) {
    return res.status(403).json({message: 'Theme does not exist.'});
  }

  if (data.screenshot) {
    const url = await uploadScreenshot(data.screenshot, req.user.id, true).catch(err => { res.status(403).json({ message: err }) });
    if (!url) return;
    delete data.screenshot;
    data.screenshot = url;
  }

   

  try {
    let update;
    if (publicTheme.approved && (publicTheme.css !== theme.css)) {
      data.updatedCss = theme.css;
      update = await PublicThemes.updateOne({_id: publicTheme._id}, data, {upsert: true,});
    } else {
      data.css = theme.css;
      update = await PublicThemes.updateOne({_id: publicTheme._id}, data);
    }
  } catch(e) {
    res.status(403).json({message: 'Something went wrong.'})
  }

  res.json({
    id: publicTheme.id,
    description: data.description || publicTheme.description,
    screenshot: data.screenshot || publicTheme.screenshot,
    approved: publicTheme.approved,
    compatible_client_version: theme.client_version,
    updatedCss: !!data.updatedCss
  })
};

async function uploadScreenshot(base64, user_id) {
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
    // buffer = await cropImage(buffer, mimeType, 500);
    // TODO: ADD ERROR HANDLING
    // DELETE TEMP FILE
    dirPath = (await tempSaveImage(`bnr.${type}`, buffer)).dirPath;
    dirPath = await compressImage(`bnr.${type}`, dirPath).catch(err => { reject("Something went wrong while compressing image.") })
    if (!dirPath) return;
    buffer = fs.createReadStream(dirPath);

    if (!buffer) {
      deleteFile(dirPath);
      return reject("Something went wrong while compressing image.")
    }
    const name = "screenshot";

    if (type !== "gif") {
      type = "webp"
    }



    const [filePath, error] = await NertiviaCDN.uploadFile({
      file: buffer,
      userId: user_id,
      fileName: `${name}.${type}`
    })
    deleteFile(dirPath);
    if (error) return reject(error);
    resolve(filePath);
  })
}

