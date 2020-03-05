const ServerMembers = require("../../models/ServerMembers");
const Messages = require("../../models/messages");
const Channels = require("../../models/channels");
const Notifications = require("./../../models/notifications");
const GDriveApi = require("./../../API/GDrive");

const path = require("path");
const sharp = require("sharp");

const sendMessageNotification = require("./../../utils/SendMessageNotification");

module.exports = async (req, res, next) => {
  //if formdata is not present.
  if (!req.busboy) return res.status(403).json({ message: "?????" });

  const { channelID } = req.params;

  const oauth2Client = req.oauth2Client;
  let message = undefined;
  let fileID = undefined;
  let stop = false;

  req.busboy.on("field", function(fieldName, fieldValue) {
    if (fieldName === "message") message = fieldValue;

    if (message) {
      if (typeof message !== "string") {
        stop = true;
        return res.status(403).json({
          status: false,
          message: "message must be a string."
        });
      }

      if (message.length >= 5000) {
        stop = true;
        return res.status(403).json({
          status: false,
          message: "Message must contain characters less than 5,000"
        });
      }
    }
  });
  req.busboy.on("error", function(err) {
    console.log("error happened");
  })

  req.busboy.on(
    "file",
    async (fieldName, fileStream, fileName, encoding, mimeType) => {
      if (stop == true) return;
      if (fieldName !== "avatar") return;
      if (fileName.match(/\/$/) || fileName.includes("/")) {
        return res.status(403).json({message: "File name must not include slashes."});
      }
      // get nertivia_uploads folder id
      const requestFolderID = await GDriveApi.findFolder(oauth2Client);
      const folderID = requestFolderID.result.id;

      let chunks = [];
      let metadata = null;
      if (checkMimeType({ fileName, mimeType })) fileStream.on("data", onData);
      fileStream.on("error",  function(err) {
        console.log("error happened");
      })

      async function onData(chunk) {
        if (chunks.length === 0) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        if (metadata) return;
        metadata = await sharp(buffer).metadata();
        fileStream.removeListener("data", onData);
      }

      const requestUploadFile = await GDriveApi.uploadFile(
        { fileName, mimeType, fileStream },
        folderID,
        oauth2Client
      );
      req.unpipe(req.busboy);
      if (requestUploadFile.ok) {
        fileID = requestUploadFile.result.data.id;
      } else
        return res.status(403).json({
          status: false,
          message: "Something went wrong."
        });

      //upload to mongodb
      const file = { fileName, fileID };
      if (metadata) {
        file.dimensions = { width: metadata.width, height: metadata.height };
      }
      const messageCreate = new Messages({
        files: [file],
        channelID,
        message,
        creator: req.user._id,
        messageID: "placeholder"
      });

      let messageCreated = await messageCreate.save();
      const messageCreatedLean = messageCreate.toObject();
      messageCreatedLean.creator = req.user;

      res.json({
        status: true,
        messageCreated
      });

      //emit
      const io = req.io;

      if (req.channel.server) {
        return serverMessage();
      } else {
        return directMessage();
      }

      async function serverMessage() {
        const rooms =
          io.sockets.adapter.rooms["server:" + req.channel.server.server_id];
        if (rooms)
          for (let clientId in rooms.sockets || []) {
            io.to(clientId).emit("receiveMessage", {
              message: messageCreatedLean
            });
          }

        //send notification
        await sendMessageNotification({
          message: messageCreatedLean,
          channelID,
          server_id: req.channel.server._id,
          sender: req.user
        });

        return;
      }
      async function directMessage() {

        const isSavedNotes = req.user.uniqueID === req.channel.recipients[0].uniqueID

        //sender
        io.in(req.user.uniqueID).emit("receiveMessage", {
          message: messageCreatedLean
        });

        if (!isSavedNotes) {
          // for group messaging, do a loop instead of [0]
          io.in(req.channel.recipients[0].uniqueID).emit("receiveMessage", {
            message: messageCreatedLean
          });

          //change lastMessage timeStamp
          const updateChannelTimeStamp = Channels.updateMany(
            {
              channelID
            },
            {
              $set: {
                lastMessaged: Date.now()
              }
            },
            {
              upsert: true
            }
          );

          // sends notification to a user.
          const sendNotification = sendMessageNotification({
            message: messageCreated,
            recipient_uniqueID: req.channel.recipients[0].uniqueID,
            channelID,
            sender: req.user
          });

          await Promise.all([updateChannelTimeStamp, sendNotification]);
      }
      }
    }
  );

  req.pipe(req.busboy);
};

function checkMimeType(file) {
  const filetypes = /jpeg|jpg|gif|png/;
  const mimeType = filetypes.test(file.mimeType);
  const extname = filetypes.test(path.extname(file.fileName).toLowerCase());
  if (mimeType && extname) {
    return true;
  }
  return false;
}
