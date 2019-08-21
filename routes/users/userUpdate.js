const Users = require('../../models/users');
const { matchedData } = require('express-validator/filter');
const bcrypt = require('bcryptjs');
const GDriveApi = require('./../../API/GDrive');
const stream = require('stream');

module.exports = async (req, res, next) => {
  const oauth2Client = req.oauth2Client;
  const data = matchedData(req);
  const user = req.user;
  // if password is not supplied and user wants to change their username || tag || password || email.
  if ( !data.password && (data.username || data.tag || data.new_password || data.email) ) {
    return res
      .status(403)
      .json({ errors: [{ param: "password", msg: "Password is required." }] });
  }

  // check if tag + username already exists || email already exists
  if (data.email || data.username || data.tag) {
    const userTagExists = await Users.findOne({
      username: data.username || user.username,
      tag: data.tag || user.tag,
      uniqueID: { $ne: user.uniqueID }
    });

    const userEmailExists = await Users.findOne({
      email: data.email,
      uniqueID: { $ne: user.uniqueID }
    });

    if (userTagExists) {
      return res.status(403).json({
        errors: [
          { param: "tag", msg: "Username with that tag is already used." }
        ]
      });
    }
    if (userEmailExists) {
      return res
        .status(403)
        .json({ errors: [{ param: "email", msg: "Email already used." }] });
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
    data.password = passwordHash;
    delete data.new_password;
  }

  if (data.avatar && oauth2Client) {
    const { ok, error, result } = await uploadAvatar(
      data.avatar,
      oauth2Client,
      res,
      req
    );
    if (!ok) {
      return res
        .status(403)
        .json({
          message:
            "Something went wrong while uploading to google drive. Please try again later."
        });
    }
    delete data.avatar;
    data.avatar = result.data.id;
  }

  try {
    await Users.updateOne({ _id: user._id }, data);
    const resObj = Object.assign({}, data);
    delete resObj.password;
    const updateSession = Object.assign({}, req.session["user"], resObj);
    req.session["user"] = updateSession;
    resObj.uniqueID = user.uniqueID;
    const io = req.io;
    res.json(resObj);

    io.in(req.user.uniqueID).emit("update_member", resObj);
  } catch (e) {
    console.log(e);
    res.status(403).json({ message: "Something went wrong. Try again later." });
  }
};


async function uploadAvatar(base64, oauth2Client, res, req) {
  return new Promise(async resolve => {
    const buffer = Buffer.from(base64.split(',')[1], 'base64');

    // 2092000 = 2mb
    const maxSize = 2092000; 
    if (buffer.byteLength > maxSize) {
      return res.status(403).json({
        message: "Image is larger than 2MB."
      });
    }
    const mimeType = base64MimeType(base64);
    const type = base64.split(';')[0].split('/')[1];
    if (!checkMimeType(mimeType)) {
      return res.status(403).json({
        message: "Invalid avatar."
      });
    }
  
    const readable = new stream.Readable()
    readable._read = () => {} // _read is required but you can noop it
    readable.push(buffer)
    readable.push(null)
  
    // get nertivia_uploads folder id
    const requestFolderID = await GDriveApi.findFolder(oauth2Client);
    if (!requestFolderID.result) return res.status(404).json({message: "If you're seeing this message, please contact Fishie@azK0 in Nertivia (Error: Google Drive folder missing.)"})
    const folderID = requestFolderID.result.id;
  
    const requestUploadFile = await GDriveApi.uploadFile(
      {
        fileName: 'avatar-'+req.user.uniqueID,
        mimeType,
        fileStream: readable
      },
      folderID,
      oauth2Client
    );
    resolve(requestUploadFile);
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