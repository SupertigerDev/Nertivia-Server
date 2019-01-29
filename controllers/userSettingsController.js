const path = require('path');
const multer  = require('multer')
const uniqid = require('uniqid');
const fs = require('fs');
const User = require('../models/users');
const Friends = require('../models/friends')

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
      cb(null, 'public/avatars')
  },
  filename: function (req, file, cb) {
      let ext = path.extname(file.originalname)
      cb(null, uniqid() + ext)
  }
});

const upload = multer({
  limits: {
    fileSize: 10490000
  },
  storage
}).single('avatar')


module.exports = {
  changeStatus: async (req, res, next) => {
    const redis = require ('./../redis');
    const emitStatus = require ('../socketController/emitUserStatus');
    const io = require('../app').io;
    const {status} = req.body;

    // change the status in redis.
    await redis.changeStatus(req.user.uniqueID, status);

    // emit status to users.
    emitStatus(req.user.uniqueID, req.user.id, status, io, true)

    res.json({ status: true, set: status });
  },
  changeAvatar: async (req, res, next) => {
    upload (req, res, async function (err) {
      if (err) return res.status(403)
        .json({ status: false, message: "Something went wrong. try again later."});

      const allowedFormats = ['.png', '.jpeg', '.gif', '.jpg' ];
      if (!allowedFormats.includes(path.extname(req.file.originalname).toLowerCase())) return res.status(403)
        .json({ status: false, message: "Something went wrong. try again later."});
      const filename = req.file.filename;
      const user = await User
        .updateOne( { _id: req.user.id}, { $set: { avatar : filename  } });
    
      if (req.user.avatar  !== "default.png" && fs.existsSync(path.join(__dirname, '../public/avatars', req.user.avatar))) {
        // Deletes the previous image.
        fs.unlinkSync(path.join(__dirname, '../public/avatars', req.user.avatar))
      }
      req.user.avatar = filename;
      res.json({ status: true });


      // emit new profile pictures
      const friends = await Friends.find({requester: req.user.id}).populate('recipient');
      
      const io = require('../app').io;
      for (let friend of friends) {

        io.in(friend.recipient.uniqueID).emit('userAvatarChange', {
          uniqueID: req.user.uniqueID,
          avatarID: filename
        });
      }
      // send owns status to every connected device 
      io.in(req.user.uniqueID).emit('multiDeviceUserAvatarChange', {avatarID: filename});
      
    })
  }
}