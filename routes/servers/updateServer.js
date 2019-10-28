
const Servers = require("../../models/servers");
const Channels = require("../../models/channels");

const GDriveApi = require('./../../API/GDrive');
const stream = require('stream');

const { matchedData } = require('express-validator/filter');
const FlakeId = require('flakeid');
const flake = new FlakeId();




module.exports = async (req, res, next) => {
  // check if this function is executed by the guild owner.
  if (!req.server.creator.equals(req.user._id))
    return res
      .status(403)
      .json({ message: "You do not have permission to update this server!" });

  const oauth2Client = req.oauth2Client;
  // filtered data
  const data = matchedData(req);
  if (data && data.default_channel_id) {
    // check if channel id is in the server
    const checkChannel = await Channels.findOne({channelID: data.default_channel_id, server: req.server._id});
    if (!checkChannel) {
      return res
        .status(404)
        .json({ message: "Channel ID does not exist in your server." });
    }
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
  const server = req.server;
  try {
    await Servers.updateOne({ server_id: server.server_id }, data);
    const io = req.io;
    io.in("server:" + req.server.server_id).emit(
      "server:update_server",
      Object.assign(data, { server_id: server.server_id })
    );
    res.json(Object.assign(data, { server_id: server.server_id }));
  } catch (e) {
    res.status(403).json({ message: "Something went wrong. Try again later." });
  }
};


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
        fileName: 'server_avatar_' + req.server.server_id,
        mimeType,
        fileStream: readable
      },
      folderID,
      oauth2Client
    );
    resolve(requestUploadFile);
  })

}