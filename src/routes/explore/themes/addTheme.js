const Express = require("express");
import {Themes} from '../../../models/Themes';
import {PublicThemes} from '../../../models/PublicThemes'

import * as nertiviaCDN from '../../../utils/uploadCDN/nertiviaCDN'
import fs from 'fs';

import tempSaveImage from '../../../utils/tempSaveImage';
import compressImage from '../../../utils/compressImage';
const flake = require('../../../utils/genFlakeId').default;


/** @type {Express.RequestHandler} */
module.exports = async (req, res, next) => {
  const oauth2Client = req.oauth2Client;
  const themeID = req.params.id;
  const { description, screenshot } = req.body;

  // check if theme exists
  const theme = await Themes.findOne({id: themeID, creator: req.user._id});
  if (!theme) {
    return res.status(404).json({message: 'id is invalid.'});
  }
  // check if public theme exists.
  const publicTheme = await PublicThemes.findOne({theme: theme._id});
  if (publicTheme) {
    return res.status(403).json({message: 'Theme is already public.'});
  }
  
  const url = await uploadScreenshot(screenshot, req.user.id, true).catch(err => { res.status(403).json({ message: err }) });
  if (!url) return;

  const id = flake.gen();
  const create = await PublicThemes.create({
    id,
    css: theme.css,
    compatible_client_version: theme.client_version,
    description,
    theme: theme._id,
    creator: req.user._id,
    screenshot: url,
  })



  res.json({
    id: create.id,
    description: create.description,
    compatible_client_version: theme.client_version,
    screenshot: create.screenshot,
    approved: false,
  })
};

function base64MimeType(encoded) {
  var result = null;

  if (typeof encoded !== "string") {
    return result;
  }

  var mime = encoded.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);

  if (mime && mime.length) {
    result = mime[1];
  }

  return result;
}
function checkMimeType(mimeType) {
  const filetypes = /jpeg|jpg|gif|png/;
  const mime = filetypes.test(mimeType);
  if (mime) {
    return true;
  }
  return false;
}

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
    if (!checkMimeType(mimeType)) {
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
    const id = flake.gen();
    const name = "screenshot";

    if (type !== "gif") {
      type = "webp"
    }


    const success = await nertiviaCDN.uploadFile(buffer, user_id, id, `${name}.${type}`)
      .catch(err => { reject(err) })
    deleteFile(dirPath);
    if (!success) return;
    resolve(`${user_id}/${id}/${name}.${type}`);
  })
}

function deleteFile(path) {
  fs.unlink(path, err => {
    if (err) console.error(err)
  });
}

