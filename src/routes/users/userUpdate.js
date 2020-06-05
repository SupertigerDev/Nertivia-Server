const Users = require('../../models/users');
const { matchedData } = require('express-validator/filter');
const bcrypt = require('bcryptjs');
const JWT = require('jsonwebtoken');
const cropImage = require('../../utils/cropImage');
import * as nertiviaCDN from '../../utils/uploadCDN/nertiviaCDN'
import config from '../../config';
const flakeId = new (require('flakeid'))();
const emitToAll = require('../../socketController/emitToAll');
const sio = require("socket.io");


module.exports = async (req, res, next) => {
  const data = matchedData(req);
  const user = req.user;
  const socketID = req.body.socketID
  let updatePassword = false
  // if password is not supplied and user wants to change their username || tag || password || email.
  if ( !data.password && (data.username || data.tag || data.new_password || data.email) ) {
    return res
      .status(403)
      .json({ errors: [{ param: "password", msg: "Password is required." }] });
  }

  // check if tag + username already exists || email already exists
  if (data.email || data.username || data.tag) {
    const userTagExists = await Users.exists({
      username: data.username || user.username,
      tag: data.tag || user.tag,
      uniqueID: { $ne: user.uniqueID }
    });

    if (data.email) {
      data.email = data.email.toLowerCase()
      const userEmailExists = await Users.exists({
        email: data.email,
        uniqueID: { $ne: user.uniqueID }
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
    const url = await uploadAvatar(data.avatar, req.user.uniqueID).catch(err => {res.status(403).json({message: err})});
    if (!url) return;
    delete data.avatar;
    data.avatar = url;
  }

  try {
    await Users.updateOne({ _id: user._id }, data);

    delete data.$inc;
    const resObj = Object.assign({}, data);
    delete resObj.password;
    const updateSession = Object.assign({}, req.session["user"], resObj, {passwordVersion: req.user.passwordVersion});
    req.session["user"] = updateSession;
    resObj.uniqueID = user.uniqueID;
    const io = req.io;
    if (updatePassword) {
      res.json({...resObj, token: JWT.sign(`${user.uniqueID}-${req.user.passwordVersion}`, config.jwtSecret).split(".").splice(1).join(".")});

      // logout other accounts
      kickUser(io, user.uniqueID, socketID)

    } else {
      res.json(resObj);
    }


    io.in(req.user.uniqueID).emit("update_member", resObj);

    // emit public data
    if (!data.avatar && !data.username) return;
    const publicObj = {uniqueID: req.user.uniqueID}
    if (data.avatar) publicObj.avatar = data.avatar;
    if (data.username) publicObj.username = data.username;
    if (data.tag) publicObj.tag = data.tag;
    emitToAll('update_member', req.user._id, publicObj, io, false)
    
  } catch (e) {
    console.log(e);
    res.status(403).json({ message: "Something went wrong. Try again later." });
  }
};


async function uploadAvatar(base64, uniqueID) {
  return new Promise(async (resolve, reject) => {
    let buffer = Buffer.from(base64.split(',')[1], 'base64');

    // 8092000 = 8mb
    const maxSize = 8092000; 
    if (buffer.byteLength > maxSize) {
      return reject("Image is larger than 8MB.")

    }
    const mimeType = base64MimeType(base64);
    const type = base64.split(';')[0].split('/')[1];
    if (!checkMimeType(mimeType)) {
      return reject("Invalid avatar.")

    }

    buffer = await cropImage(buffer, mimeType, 200);

    if (!buffer) {
      return reject("Something went wrong while cropping image.")
    }
    const id = flakeId.gen();


    const success = await nertiviaCDN.uploadFile(buffer, uniqueID, id, `avatar.${type}`)
      .catch(err => {reject(err)})
    if (!success) return;
    resolve(`${uniqueID}/${id}/avatar.${type}`);
  })
}



function base64MimeType(encoded) {
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

function checkMimeType(mimeType) {
  const filetypes = /jpeg|jpg|gif|png/;
  const mime = filetypes.test(mimeType);
  if (mime) {
    return true;
  }
  return false;
}

/**
 *
 * @param {sio.Server} io
 */
async function kickUser(io, uniqueID, socketID) {
  const rooms = io.sockets.adapter.rooms[uniqueID];
  if (!rooms || !rooms.sockets) return;

  for (const clientId in rooms.sockets) {
    const client = io.sockets.connected[clientId];
    if (!client) continue;
    if (client.id === socketID) continue;
    client.emit("auth_err", "Password Changed.");
    client.disconnect(true);
  }
}
