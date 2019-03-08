const path = require('path');
const multer = require('multer')
const uniqid = require('uniqid');
const fs = require('fs');
const User = require('../models/users');
const GDriveApi = require('./../API/GDrive');
const Friends = require('../models/friends')

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/temp_uploads')
  }
});



module.exports = {
  //make a seperate router for this instead.
  changeStatus: async (req, res) => {
    const redis = require('./../redis');
    const emitStatus = require('../socketController/emitUserStatus');
    const io = req.io
    const {
      status
    } = req.body;

    // change the status in redis.
    await redis.changeStatus(req.user.uniqueID, status);

    // emit status to users.
    emitStatus(req.user.uniqueID, req.user._id, status, io, true)

    res.json({
      status: true,
      set: status
    });
  },



  changeAvatar: async (req, res) => {
    const oauth2Client = req.oauth2Client;
    // 10490000 = 10mb
    const maxSize = 10490000;
    if (req.headers['content-length'] >= maxSize)
      return res.status(403).json({
        status: false,
        message: "Image is larger than 10MB."
      });


    if (!req.busboy)
      return res.status(403).json({
        status: false,
        message: "Image is not present."
      });

    req.pipe(req.busboy)
    req.busboy.on("file", async (fieldName, fileStream, fileName, encoding, mimeType) => {

      if (!checkMimeType({fileName, mimeType}))
        return res.status(403).json({
          status: false,
          message: "Invalid image."
        });

      // get nertivia_uploads folder id
      const requestFolderID = await GDriveApi.findFolder(oauth2Client);
      const folderID = requestFolderID.result.id;

      const requestUploadFile = await GDriveApi.uploadFile({
        fileName,
        mimeType,
        fileStream
      }, folderID, oauth2Client);

      const user = await User.updateOne({
        _id: req.user._id
      }, {
        $set: {
          avatar: requestUploadFile.result.data.id
        }
      });
      //change in session
      req.session['user'].avatar = requestUploadFile.result.data.id;

      res.json({
        status: true
      });

      // emit new profile pictures
      emitAvatar();

      function checkMimeType(file) {
        const filetypes = /jpeg|jpg|gif|png/;
        const mimeType = filetypes.test(file.mimeType);
        const extname = filetypes.test(path.extname(file.fileName).toLowerCase());
        if (mimeType && extname) {
          return true;
        }
        return false;
      }
      async function emitAvatar() {
        const friends = await Friends.find({
          requester: req.user._id
        }).populate('recipient');

        const io = req.io
        for (let friend of friends) {

          io.in(friend.recipient.uniqueID).emit('userAvatarChange', {
            uniqueID: req.user.uniqueID,
            avatarID: requestUploadFile.result.data.id
          });
        }
        // send owns status to every connected device 
        io.in(req.user.uniqueID).emit('multiDeviceUserAvatarChange', {
          avatarID: requestUploadFile.result.data.id
        });
      }
    })
  }
}