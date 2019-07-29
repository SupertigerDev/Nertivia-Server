const Users = require('../models/users');
const { matchedData } = require('express-validator/filter');
const bcrypt = require('bcryptjs');
module.exports = {
  details: async (req, res, next) => {
    const uniqueID = req.params.uniqueID;

    if (!uniqueID) {
      return res.json({
        user: req.user
      });
    }

    const user = await Users.findOne({
      uniqueID
    }).select('-status -__v -_id -friends +about_me').lean();
    if (!user) return res.status(404).json({
      message: "That user was not found."
    });
    res.json({
      user
    });

  },
  updateUser: async(req, res, next) => {
    const oauth2Client = req.oauth2Client;
    const data = matchedData(req);
    const user = req.user;
    // if password isnt supplied and user wants to change their username || tag || password || email.
    if (!data.password && (data.username || data.tag || data.new_password || data.email)){
      return res.status(403).json({errors: [{param: 'password', msg: 'Password is required.'}]})
    }
    // check if tag + username already exists || email already exists
    if (data.email || data.username || data.tag) {
      const userTagExists = await Users.findOne({username: data.username || user.username, tag: data.tag || user.tag, uniqueID: {$ne: user.uniqueID}})
      const userEmailExists = await Users.findOne({email: data.email, uniqueID: {$ne: user.uniqueID}})
      if (userTagExists) {
        return res.status(403).json({errors: [{param: 'tag', msg: 'Username with that tag already exists!'}]})
      }
      if (userEmailExists) {
        return res.status(403).json({errors: [{param: 'email', msg: 'That email already exists!'}]})
      }
    }


    // Verify password
    if (data.password) {
      const dbUser = await Users.findById(user._id).select('+password');
      if (!dbUser) {
        return res.status(403).json({message: 'Something went wrong.'})
      }
      const passwordValid = await dbUser.isValidPassword(data.password);
      if (!passwordValid) {
        return res.status(403).json({errors: [{param: 'password', msg: 'Password is invalid.'}]})
      }

    }

    if (data.new_password) {
      const salt = await bcrypt.genSalt(10);
      // Generate a password hash
      const passwordHash = await bcrypt.hash(data.new_password, salt)
      data.password = passwordHash;
      // delete password on reponse
    }


    if (data.avatar && oauth2Client) {
      const {ok, error, result} = await uploadAvatar(data.avatar, oauth2Client, res, req);
      if (!ok) {
        return res.status(403).json({message: "Something went wrong while uploading to google drive. Please try again later."})
      }
      delete data.avatar;
      data.avatar = result.data.id
    }

    try {
      await Users.updateOne({_id: user._id}, data);
      const io = req.io;
      io.in("server:" + req.server.server_id).emit('server:update_server', Object.assign(data, {server_id: server.server_id}));
      res.json(data, {server_id: server.server_id});
    } catch (e) {
      res.status(403).json({message: 'Something went wrong. Try again later.'})
    }


    res.end();
  }
}

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