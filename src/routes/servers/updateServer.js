const Servers = require("../../models/servers");
const Channels = require("../../models/channels");

import * as nertiviaCDN from '../../utils/uploadCDN/nertiviaCDN'


const { matchedData } = require("express-validator");
const flake = require('../../utils/genFlakeId').default;
const cropImage = require('../../utils/cropImage');

module.exports = async (req, res, next) => {
  // check if this function is executed by the guild owner.
  if (req.server.creator !== req.user._id)
    return res
      .status(403)
      .json({ message: "You do not have permission to update this server!" });

  const oauth2Client = req.oauth2Client;
  // filtered data
  const data = matchedData(req);
  if (data && data.default_channel_id) {
    // check if channel id is in the server
    const checkChannel = await Channels.findOne({
      channelID: data.default_channel_id,
      server: req.server._id
    });
    if (!checkChannel) {
      return res
        .status(404)
        .json({ message: "Channel ID does not exist in your server." });
    }
  }


  if (data.avatar) {
    const url = await uploadAvatar(data.avatar, req.user.uniqueID, false).catch(err => {res.status(403).json({message: err})});
    if (!url) return;
    delete data.avatar;
    data.avatar = url;
  }


  if (data.banner) {
    const url = await uploadAvatar(data.banner, req.user.uniqueID, true).catch(err => {res.status(403).json({message: err})});
    if (!url) return;
    delete data.banner;
    data.banner = url;
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

async function uploadAvatar(base64, uniqueID, isBanner) {
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
      return reject("Invalid image.")

    }

    if (isBanner) {
      buffer = await cropImage(buffer, mimeType, 500);
    } else {
      buffer = await cropImage(buffer, mimeType, 200);
    }

    buffer = await cropImage(buffer, mimeType, 200);

    if (!buffer) {
      return reject("Something went wrong while cropping image.")
    }
    const id = flake.gen();
    const name = isBanner ? 'bnr' : 'avatar';


    const success = await nertiviaCDN.uploadFile(buffer, uniqueID, id, `${name}.${type}`)
      .catch(err => {reject(err)})
    if (!success) return;
    resolve(`${uniqueID}/${id}/${name}.${type}`);
  })
}


// async function uploadAvatar(base64, oauth2Client, res, req, isBanner) {
//   return new Promise(async resolve => {
//     let buffer = Buffer.from(base64.split(",")[1], "base64");

//     // 2092000 = 2mb
//     const maxSize = 2092000;
//     if (buffer.byteLength > maxSize) {
//       return res.status(403).json({
//         message: "Image is larger than 2MB."
//       });
//     }
//     const mimeType = base64MimeType(base64);
//     const type = base64.split(";")[0].split("/")[1];
//     if (!checkMimeType(mimeType)) {
//       return res.status(403).json({
//         message: "Invalid avatar."
//       });
//     }
//     if (isBanner) {
//       buffer = await cropImage(buffer, mimeType, 500);
//     } else {
//       buffer = await cropImage(buffer, mimeType, 200);
//     }
//     if (!buffer) {
//       return res.status(403).json({
//         message: "Something went wrong while cropping image."
//       });
//     }

//     const readable = new stream.Readable();
//     readable._read = () => {}; // _read is required but you can noop it
//     readable.push(buffer);
//     readable.push(null);

//     // get nertivia_uploads folder id
//     const requestFolderID = await GDriveApi.findFolder(oauth2Client);
//     if (!requestFolderID.result)
//       return res
//         .status(404)
//         .json({
//           message:
//             "If you're seeing this message, please contact Fishie@azK0 in Nertivia (Error: Google Drive folder missing.)"
//         });
//     const folderID = requestFolderID.result.id;

//     const requestUploadFile = await GDriveApi.uploadFile(
//       {
//         fileName: "server_avatar_" + req.server.server_id,
//         mimeType,
//         fileStream: readable
//       },
//       folderID,
//       oauth2Client
//     );
//     resolve(requestUploadFile);
//   });
// }
