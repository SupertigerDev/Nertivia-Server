const config = require("../config");
const Friends = require("../models/friends");
const Users = require("../models/users");
const ServerMembers = require("../models/ServerMembers");
const Messages = require("../models/messages");
const Servers = require("../models/servers");
const Channels = require("../models/channels");
const Notifications = require("./../models/notifications");
const GDriveApi = require("./../API/GDrive");

module.exports = {
  get: async (req, res, next) => {
    const { channelID } = req.params;
    const continueChannelID = req.query.continue;

    // Get messages
    let messages;
    if (continueChannelID) {
      // check if continue param is entered
      const continueFromMessage = await Messages.findOne({
        messageID: continueChannelID
      });
      if (!continueFromMessage) {
        return res.status(403).json({
          status: false,
          message: "continue message was not found."
        });
      }
      messages = await Messages.find({
        channelID,
        _id: {
          $lt: continueFromMessage.id
        }
      })
        .sort({
          _id: -1
        })
        .populate({
          path: "creator",
          select: "-_id -id  -__v -email -friends -status -created -lastSeen"
        })
        .limit(50)
        .lean();
    } else {
      messages = await Messages.find(
        {
          channelID
        },
        "-__v -_id"
      )
        .populate({
          path: "creator",
          select: "-_id -id  -__v -email -friends -status -created -lastSeen"
        })
        .sort({
          _id: -1
        })
        .limit(50)
        .lean();
    }

    return res.json({
      status: true,
      channelID,
      messages
    });
  },
  //uploading files
  postFormData: async (req, res, next) => {
    //if formdata is not present.
    if (!req.busboy) return res.status(403).json({message: "?????"})

    const redis = require("../redis");
    const { channelID } = req.params;

    const oauth2Client = req.oauth2Client;
    let message = undefined;
    let fileID = undefined;
    let stop = false;

    req.busboy.on("field", function(fieldName, fieldValue) {
      if (fieldName === "message") message = fieldValue;
      if (message.length > 5000) {
        stop = true;
        return res.status(403).json({
          status: false,
          message: "Message must contain characters less than 5,000"
        });
      }
    });

    req.busboy.on(
      "file",
      async (fieldName, fileStream, fileName, encoding, mimeType) => {
        if (stop == true) return;
        if (fieldName !== "avatar") return;

        // get nertivia_uploads folder id
        const requestFolderID = await GDriveApi.findFolder(oauth2Client);
        const folderID = requestFolderID.result.id;

        const requestUploadFile = await GDriveApi.uploadFile(
          {
            fileName,
            mimeType,
            fileStream
          },
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
        const messageCreate = new Messages({
          files: [
            {
              fileName,
              fileID
            }
          ],
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
          const rooms = io.sockets.adapter.rooms["server:" + req.channel.server.server_id];
          if (rooms)
            for (let clientId in rooms.sockets || []) {
              io.to(clientId).emit("receiveMessage", {
                message: messageCreatedLean
              });
            }
    
          //send notification
          //find all members in the server.
          const members = await ServerMembers.find({server: req.channel.server._id}).populate('member');

          const members_uniqueID = members.map(m => m.member.uniqueID).filter(m => m !== req.user.uniqueID);
          
          let notificationPromises = []
          for await (const memberUniqueID of members_uniqueID) {
            
            const sendNotificaiton = Notifications.findOneAndUpdate(
              {
                recipient: memberUniqueID,
                channelID
              },
              {
                $set: {
                  recipient: memberUniqueID,
                  channelID,
                  type: "MESSAGE_CREATED",
                  lastMessageID: messageCreated.messageID,
                  sender: req.user._id
                },
                $inc: {
                  count: 1
                }
              },
              {
                upsert: true
              }
            );
            notificationPromises.push(sendNotificaiton);
          }
          await Promise.all(notificationPromises);


          return;
        }
        async function directMessage() {
           //sender
           io.in(req.user.uniqueID).emit("receiveMessage", {
            message: messageCreatedLean
          });
    
          // for group messaging, do a loop instead of [0]
          io.in(req.channel.recipients[0].uniqueID).emit("receiveMessage", {
            message: messageCreatedLean
          });
    
          //change lastMessage timeStamp
          const updateChannelTimeStap = Channels.updateMany(
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
          const sendNotificaiton = Notifications.findOneAndUpdate(
            {
              recipient: req.channel.recipients[0].uniqueID,
              channelID
            },
            {
              $set: {
                recipient: req.channel.recipients[0].uniqueID,
                channelID,
                type: "MESSAGE_CREATED",
                lastMessageID: messageCreated.messageID,
                sender: req.user._id
              },
              $inc: {
                count: 1
              }
            },
            {
              upsert: true
            }
          );
          await Promise.all([updateChannelTimeStap, sendNotificaiton]);
        }


      }
    );

    req.pipe(req.busboy);
  },
  post: async (req, res, next) => {
    const redis = require("../redis");
    const { channelID } = req.params;
    const { tempID, message, socketID } = req.body;

    if (!message || message.trim() === "") return next();

    if (message.length > 5000) {
      return res.status(403).json({
        status: false,
        message: "Message must contain characters less than 5,000"
      });
    }


    const messageCreate = new Messages({
      channelID,
      message,
      creator: req.user._id,
      messageID: "placeholder"
    });

    let messageCreated = await messageCreate.save();

    const user = {
      uniqueID: req.user.uniqueID,
      username: req.user.username,
      tag: req.user.tag,
      avatar: req.user.avatar,
      admin: req.user.admin
    };
    messageCreated = {
      channelID,
      message,
      creator: user,
      created: messageCreated.created,
      messageID: messageCreated.messageID
    };

    res.json({
      status: true,
      tempID,
      messageCreated
    });
  
    req.message_status = true;
    req.message_id = messageCreated.messageID
    next();

    // emit
    const io = req.io;

    if (req.channel.server) {
      return serverMessage();
    } else {
      return directMessage();
    }

    async function serverMessage() {
      const clients =
        io.sockets.adapter.rooms["server:" + req.channel.server.server_id]
          .sockets;
      for (let clientId in clients) {
        if (clientId !== socketID) {
          io.to(clientId).emit("receiveMessage", {
            message: messageCreated
          });
        }
      }


      //send notification
      //find all members in the server.
      const members = await ServerMembers.find({server: req.channel.server._id}).populate('member');

      const members_uniqueID = members.map(m => m.member.uniqueID).filter(m => m !== req.user.uniqueID);
      
      let notificationPromises = []
      for await (const memberUniqueID of members_uniqueID) {
        
      const sendNotificaiton = Notifications.findOneAndUpdate(
        {
          recipient: memberUniqueID,
          channelID
        },
        {
          $set: {
            recipient: memberUniqueID,
            channelID,
            type: "MESSAGE_CREATED",
            lastMessageID: messageCreated.messageID,
            sender: req.user._id
          },
          $inc: {
            count: 1
          }
        },
        {
          upsert: true
        }
      );
      notificationPromises.push(sendNotificaiton);
     }
     await Promise.all(notificationPromises);


      return;
    }

    async function directMessage() {
      // for group messaging, do a loop instead of [0]
      io.in(req.channel.recipients[0].uniqueID).emit("receiveMessage", {
        message: messageCreated
      });

      // Loop for other users logged in to the same account and emit (exclude the sender account.).
      //TODO: move this to client side for more performance.
      const rooms = io.sockets.adapter.rooms[req.user.uniqueID];
      if (rooms)
        for (let clientId in rooms.sockets || []) {
          if (clientId !== socketID) {
            io.to(clientId).emit("receiveMessage", {
              message: messageCreated,
              tempID
            });
          }
        }

      //change lastMessage timeStamp
      const updateChannelTimeStap = Channels.updateMany(
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
      const sendNotificaiton = Notifications.findOneAndUpdate(
        {
          recipient: req.channel.recipients[0].uniqueID,
          channelID
        },
        {
          $set: {
            recipient: req.channel.recipients[0].uniqueID,
            channelID,
            type: "MESSAGE_CREATED",
            lastMessageID: messageCreated.messageID,
            sender: req.user._id
          },
          $inc: {
            count: 1
          }
        },
        {
          upsert: true
        }
      );
      await Promise.all([updateChannelTimeStap, sendNotificaiton]);
    }
  }
};
