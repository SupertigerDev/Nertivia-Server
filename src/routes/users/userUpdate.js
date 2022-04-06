import { Users } from "../../models/Users";
const { matchedData } = require('express-validator');
const bcrypt = require('bcryptjs');
import {cropImage} from '../../utils/cropImage'
import compressImage from '../../utils/compressImage';
import { kickUser } from '../../utils/kickUser';
import tempSaveImage from '../../utils/tempSaveImage';
import * as NertiviaCDN from '../../common/NertiviaCDN'
import { USER_UPDATED } from "../../ServerEventNames";
import { base64MimeType, isImageMime } from "../../utils/image";
import { deleteFile } from "../../utils/file";
import * as UserCache from '../../cache/User.cache';
import { emitToFriendsAndServers } from "../../socket/socket";
import { signToken } from "../../utils/JWT";
const fs = require("fs");


module.exports = async (req, res, next) => {
  let data = matchedData(req);
  if (data.username) {
    data.username = data.username.replace(
      /[\xA0\x00-\x09\x0B\x0C\x0E-\x1F\x7F\u{2000}-\u{200F}\u{202F}\u{2800}\u{17B5}\u{17B5}\u{17B5}\u{17B5}\u{17B5}\u{17B5}]/gu,
      ""
    );
    // check if result is empty
    if (!data.username.trim()) {
      return res
      .status(403)
      .json({ errors: [{ param: "username", msg: "Username is required." }] });
    }
  }
  const user = req.user;
  const socketID = req.body.socketID
  let updatePassword = false
  // if password is not supplied and user wants to change their email or password.
  if ( !data.password && (data.new_password || data.email) ) {
    return res
      .status(403)
      .json({ errors: [{ param: "password", msg: "Password is required." }] });
  }

  // check if tag + username already exists || email already exists
  if (data.email || data.username || data.tag) {
    const userTagExists = await Users.exists({
      username: data.username || user.username,
      tag: data.tag || user.tag,
      id: { $ne: user.id }
    });

    if (data.email) {
      data.email = data.email.toLowerCase()
      const userEmailExists = await Users.exists({
        email: data.email,
        id: { $ne: user.id }
      });
      if (userEmailExists) {
        return res
        .status(403)
        .json({ errors: [{ param: "email", msg: "Email already used." }] });
      }
    }


    if (userTagExists) {
      return res.status(403).json({
        errors: [
          { param: "tag", msg: "Username with that tag is already used." }
        ]
      });
    }
  }

  // Verify password
  if (data.password) {
    const dbUser = await Users.findById(user._id).select("+password");
    if (!dbUser) {
      return res.status(403).json({ message: "Something went wrong." });
    }
    const passwordValid = await dbUser.isValidPassword(data.password);
    if (!passwordValid) {
      return res
        .status(403)
        .json({ errors: [{ param: "password", msg: "Password is invalid." }] });
    }
    delete data.password;
  }

  //change password if new_password exists
  if (data.new_password) {
    const salt = await bcrypt.genSalt(10);
    // Generate a password hash
    const passwordHash = await bcrypt.hash(data.new_password, salt);
    if (!passwordHash) {
      return res
        .status(403)
        .json({
          message: "Something went wrong, try again later. (hash password fail)"
        });
    }
    updatePassword = true;
    data.password = passwordHash;
    data.$inc = { passwordVersion: 1 }
    req.user.passwordVersion = !req.user.passwordVersion ? 1 : req.user.passwordVersion + 1
    delete data.new_password;
  }

  if (data.avatar) {
    const url = await uploadAvatar(data.avatar, req.user.id).catch(err => {res.status(403).json({message: err})});
    if (!url) return;
    delete data.avatar;
    data.avatar = url;
  }
  if (data.banner) {
    const url = await uploadBanner(data.banner, req.user.id).catch(err => {res.status(403).json({message: err})});
    if (!url) return;
    delete data.banner;
    data.banner= url;
  }

  try {
    await Users.updateOne({ _id: user._id }, data);

    delete data.$inc;
    const resObj = Object.assign({}, data);
    delete resObj.password;
    const updateCache = {
      ...resObj,
      passwordVersion: req.user.passwordVersion
    }
    await UserCache.updateUser(req.user.id, updateCache)
    resObj.id = user.id;
    const io = req.io;
    if (updatePassword) {
      const token = await signToken(user.id, req.user.passwordVersion)
      res.json({...resObj, token: token });

      // logout other accounts
      kickUser(user.id, "Password Changed.", socketID)

    } else {
      res.json(resObj);
    }


    io.in(req.user.id).emit(USER_UPDATED, resObj);

    // emit public data
    if (!data.avatar && !data.username) return;
    const publicObj = {id: req.user.id}
    if (data.avatar) publicObj.avatar = data.avatar;
    if (data.username) publicObj.username = data.username;
    if (data.tag) publicObj.tag = data.tag;
    emitToFriendsAndServers({
      event: USER_UPDATED,
      data: publicObj,
      userObjectId: req.user._id,
      emitToSelf: false,
    })
    
  } catch (e) {
    console.log(e);
    res.status(403).json({ message: "Something went wrong. Try again later." });
  }
};

async function uploadAvatar(base64, user_id) {
  return uploadImage(base64, user_id, 200, 'avatar')
}
async function uploadBanner(base64, user_id) {
  return uploadImage(base64, user_id, 1900, 'banner')
}



async function uploadImage(base64, user_id, size, name) {
  return new Promise(async (resolve, reject) => {
    let buffer = Buffer.from(base64.split(',')[1], 'base64');

    // 8092000 = 8mb
    const maxSize = 8092000; 
    if (buffer.byteLength > maxSize) {
      return reject("Image is larger than 8MB.")

    }
    const mimeType = base64MimeType(base64);
    const type = base64.split(';')[0].split('/')[1];
    if (!isImageMime(mimeType)) {
      return reject("Invalid " + name)

    }

    let dirPath = "";

    if (name === "banner") {
      dirPath = (await tempSaveImage(`bnr.${type}`, buffer)).dirPath;
      dirPath = await compressImage(`bnr.${type}`, dirPath).catch(err => {reject("Something went wrong while compressing image.") })
      if (!dirPath) return;
      buffer = fs.createReadStream(dirPath);
    } else {
      buffer = await cropImage(buffer, mimeType, size);
    }

    if (!buffer) {
      if (name === "banner") deleteFile(dirPath);
      return reject("Something went wrong while cropping image.")
    }


    const [filePath, error] = await NertiviaCDN.uploadFile({
      file: buffer,
      fileName: `${name}.${type}`,
      userId: user_id,
    })

    if (name === "banner") deleteFile(dirPath);

    if (error) {
      reject(error);
      return
    };
    resolve(filePath);
  })
}
