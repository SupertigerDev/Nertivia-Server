const Servers = require("../models/servers");
const Channels = require("../models/channels");
const User = require("../models/users");
const ServerInvites = require("../models/ServerInvites");
const Messages = require("../models/messages");
const Notifications = require('./../models/notifications');
const ServerMembers = require("../models/ServerMembers");
const mongoose = require("mongoose");
const { matchedData } = require('express-validator/filter');

const FlakeId = require('flakeid');
const flake = new FlakeId();

const GDriveApi = require('./../API/GDrive');
const stream = require('stream');
const fs = require('fs');

module.exports = {
  post: async (req, res, next) => {
    const { name } = req.body;
    const user_id = req.user._id;
    // A user can only create 10 servers.
    const checkLimitExceeded = await Servers.find({ creator: user_id });

    if (checkLimitExceeded.length >= 10)
      return res.status(403).json({
        message: "Reached the maximum limit of servers."
      });
      
    const channelID = flake.gen();
    const createServer = await Servers.create({
      name: name.trim(),
      creator: user_id,
      default_channel_id: channelID
    });

    const createServerObj = createServer.toObject();

    const createChannel = await Channels.create({
      name: "General",
      channelID: channelID,
      server: createServer._id,
      lastMessaged: Date.now()
    });

    const addServerUser = await User.updateOne(
      { _id: user_id },
      { $push: { servers: createServer._id } }
    );
    const addServerMember = await ServerMembers.create({
      server: createServer._id,
      member: user_id,
      type: "OWNER"
    });

    createServerObj.creator = { uniqueID: req.user.uniqueID };
    createServerObj.__v = undefined;
    createServerObj._id = undefined;
    res.json(createServerObj);

    const io = req.io;
    // send owns status to every connected device
    createServerObj.channels = [createChannel];
    const serverMember = addServerMember.toObject();
    serverMember.member = {
      username: req.user.username,
      tag: req.user.tag,
      avatar: req.user.avatar,
      uniqueID: req.user.uniqueID
    }
    serverMember.server_id = createServer.server_id;

    io.in(req.user.uniqueID).emit("server:joined", createServerObj);
    io.in(req.user.uniqueID).emit("server:member_add", {serverMember: serverMember});
    // join room
    const room = io.sockets.adapter.rooms[req.user.uniqueID];
    if (room)
      for (let clientId in room.sockets || []) {
        io.sockets.connected[clientId].join("server:" + createServer.server_id);
      }
  },
  getChannels: async (req, res) => {
    // find all channels
    const channels = await Channels.find({ server: req.server._id });
    res.json(channels);
  },
  createInvite: async (req, res) => {


    //check if invite limit reached.
    const invites = await ServerInvites.find( { server: req.server._id, creator: req.user._id} );
    if (invites.length >= 30) {
      return res.status(403).json({
        message: "You have reached the maximum limit of invites for this server."
      });
    }

    const inviteCode = generateString(6);

    const create = await ServerInvites.create({
      server: req.server._id,
      creator: req.user._id,
      invite_code: inviteCode
    });

    res.json({ invite_code: inviteCode });
  },
  getInvites: async (req, res) => {
    const invites = await ServerInvites.find({
      server: req.server._id,
      creator: req.user._id
    });
    res.json(invites);
  },
  getInviteDetail: async (req, res) => {
    const inviteCode = req.params.invite_code;

    // Find invite
    const invite = await ServerInvites.findOne({ invite_code: inviteCode })
      .populate("server")
      .lean();

    if (!invite) {
      return res.status(404).json({ message: "Invalid invite." });
    }

    res.json(invite.server);
  },
  joinServer: async (req, res) => {
    const inviteCode = req.params.invite_code;

    // Find invite
    const invite = await ServerInvites.findOne({ invite_code: inviteCode })
      .populate({ path: "server", populate: [{ path: "creator" }] })
      .lean();

    if (!invite) return res.status(404).json({ message: "Invalid invite." });

    // check if user is already joined
    const joined = await User.findOne({
      _id: req.user._id,
      servers: invite.server._id
    });

    if (joined) return res.status(409).json({ message: "Already joined!" });
    const redis = require('./../redis');

    const addServerUser = await User.updateOne(
      { _id: req.user._id },
      { $push: { servers: invite.server._id } }
    );
    const addServerMember = await ServerMembers.create({
      server: invite.server._id,
      member: req.user._id
    });
    let serverChannels = await Channels.find({server: invite.server._id}).lean();

    const createServerObj = Object.assign({}, invite.server);
    createServerObj.creator = { uniqueID: createServerObj.creator.uniqueID };
    createServerObj.__v = undefined;
    createServerObj._id = undefined;
    res.json(createServerObj);

    const io = req.io;

    const serverMember = {
      server_id: invite.server.server_id,
      type: "MEMBER",
      member: {
        username: req.user.username,
        tag: req.user.tag,
        avatar: req.user.avatar,
        uniqueID: req.user.uniqueID,
      }
    }
    // get user presence 
    const presence = await redis.getPresence(serverMember.member.uniqueID);
    io.in("server:" + invite.server.server_id).emit("server:member_add", {serverMember, presence: presence.result[1]})


    // send owns status to every connected device
    createServerObj.channels = serverChannels;
    io.in(req.user.uniqueID).emit("server:joined", createServerObj);
    // join room
    const room = io.sockets.adapter.rooms[req.user.uniqueID];
    if (room)
      for (let clientId in room.sockets || []) {
        if (io.sockets.connected[clientId]) {
          io.sockets.connected[clientId].join(
            "server:" + createServerObj.server_id
          );
        }
      }

    // send join message

    const messageCreate = new Messages({
      channelID: invite.server.default_channel_id,
      creator: req.user._id,
      messageID: "placeholder",
      type: 1 // join message
    });

    let messageCreated = await messageCreate.save();
    const user = {
      uniqueID: req.user.uniqueID,
      username: req.user.username,
      tag: req.user.tag,
      avatar: req.user.avatar,
      admin: req.user.admin
    };
    messageCreated = messageCreated.toObject();
    messageCreated.creator = user;
    // emit message
    const serverRooms = io.sockets.adapter.rooms["server:" + createServerObj.server_id];
    if (serverRooms){
      for (let clientId in serverRooms.sockets || []) {
        io.to(clientId).emit("receiveMessage", {
          message: messageCreated
        });
      }
    }

    // send members list 

    let serverMembers = await ServerMembers.find({server: invite.server._id}).populate('member').lean();

    const memberPresences = await redis.getPresences(serverMembers.map(sm => sm.member.uniqueID));
    serverMembers = serverMembers.map(sm => {

      delete sm.server;
      delete sm._id
      delete sm.__v
      sm.member = {
        username: sm.member.username,
        tag: sm.member.tag,
        avatar: sm.member.avatar,
        uniqueID: sm.member.uniqueID,
      }
      sm.server_id = invite.server.server_id
      return sm
    })
    io.to(req.user.uniqueID).emit('server:members', {serverMembers, memberPresences: memberPresences.result})

    
  },
  deleteLeaveServer: async (req, res) => {
    const redis = require("../redis");
    // check if its the creator and delete the server.

    const channels = await Channels.find({ server: req.server._id });
    let channelIDArray = [];

    for (let index = 0; index < channels.length; index++) {
      channelIDArray.push(channels[index].channelID);
    }

    if (req.server.creator.equals(req.user._id)) {
      await redis.delServer(req.server.server_id)
      await Servers.deleteOne({ _id: req.server._id });
      if (channelIDArray) {
        await Messages.deleteMany({ channelID: { $in: channelIDArray } });
        await Notifications.deleteMany({channelID: {$in: channelIDArray}})
      }
      await Channels.deleteMany({ server: req.server._id });
      await ServerMembers.deleteMany({ server: req.server._id });
      await ServerInvites.deleteMany({ server: req.server._id });

      await User.updateMany({ $pullAll: { servers: [req.server._id] } });
      res.json({status: "Done!"})

      //EMIT
      const io = req.io;
      const rooms = io.sockets.adapter.rooms["server:" + req.server.server_id];
      if (rooms)
        for (let clientId in rooms.sockets || []) {
          io.sockets.connected[clientId].emit("server:leave", {
            server_id: req.server.server_id
          });
          io.sockets.connected[clientId].leave("server:" + req.server.server_id);
        }
      return;
    }
    // Leave server
    if (channelIDArray) {
      await Notifications.deleteMany({channelID: {$in: channelIDArray}, recipient: req.user.uniqueID})
    }
    await redis.remServerMember(req.user.uniqueID, req.server.server_id)
    await User.updateOne({_id: req.user._id}, {$pullAll: { servers: [req.server._id] } });
    await ServerMembers.deleteMany({member: req.user._id, server: req.server._id });
    res.json({status: "Done!"});
    const io = req.io;


    
    const rooms = io.sockets.adapter.rooms[req.user.uniqueID];
    if (rooms)
    for (let clientId in rooms.sockets || []) {
      if (io.sockets.connected[clientId]) {
        io.sockets.connected[clientId].emit("server:leave", { 
          server_id: req.server.server_id
        });
        io.sockets.connected[clientId].leave("server:" + req.server.server_id);
      }
    }

    io.in("server:" + req.server.server_id).emit("server:member_remove", {uniqueID: req.user.uniqueID, server_id: req.server.server_id})



    // send leave message

    const messageCreate = new Messages({
      channelID: req.server.default_channel_id,
      creator: req.user._id,
      messageID: "placeholder",
      type: 2 // leave message
    });

    let messageCreated = await messageCreate.save();
    const user = {
      uniqueID: req.user.uniqueID,
      username: req.user.username,
      tag: req.user.tag,
      avatar: req.user.avatar,
      admin: req.user.admin
    };
    messageCreated = messageCreated.toObject();
    messageCreated.creator = user;
    // emit message
    const roomsMsg = io.sockets.adapter.rooms["server:" + req.server.server_id];
    if (roomsMsg)
      for (let clientId in roomsMsg.sockets || []) {
        io.to(clientId).emit("receiveMessage", {
          message: messageCreated
        });
      }


  },
  createChannel: async ( req, res ) => {
    // check if this function is executed by the guild owner.
    if (!req.server.creator.equals(req.user._id))
      return res.status(403).json({ message: "You do not have permission to create channels!" });
    const { name } = req.body;
    if (!name || name.trim() === "") 
      return res.status(403).json({ message: "Enter a channel name!" });
    
    const createChannel = await Channels.create({
      name: name,
      channelID: generateNum(19),
      server: req.server._id,
      lastMessaged: Date.now()
    });
    const io = req.io;

    const channelObj = {
      channelID: createChannel.channelID,
      lastMessaged: createChannel.lastMessaged,
      name: createChannel.name,
      server_id: req.server.server_id,
      status: 0,
      recipients: createChannel.recipients
    }
    io.in("server:" + req.server.server_id).emit('server:add_channel', {channel: channelObj});
    
    res.json({channel: channelObj});
 
  },
  updateChannel: async (req, res) => {
    // check if this function is executed by the guild owner.
    if (!req.server.creator.equals(req.user._id))
      return res.status(403).json({ message: "You do not have permission to update channels!" });
    const data = req.body;
    const server = req.server
    const channelID = req.params.channel_id
    try {
      await Channels.updateOne({channelID}, {name: data.name});
      const io = req.io;
      io.in("server:" + req.server.server_id).emit('server:update_channel', {name: data.name, channelID});
      res.json({name: data.name, channelID})
    } catch (e) {
      res.status(403).json({message: 'Something went wrong. Try again later.'})
    }

  },
  deleteChannel: async (req, res) => {
    // check if this function is executed by the guild owner.
    if (!req.server.creator.equals(req.user._id))
      return res.status(403).json({ message: "You do not have permission to delete channels!" });
    
    const server = req.server;
    const channelID = req.params.channel_id
    // check if its default channel
    if (req.server.default_channel_id.toString() === channelID.toString()){
      return res.status(403).json({message: "Cannot delete default channel."})
    }
    try {
      await Notifications.remove({channelID});
      await Channels.deleteOne({channelID})
      await Messages.deleteMany({channelID});
      const redis = require('./../redis');
      await redis.removeServerChannel(channelID);
      const io = req.io;
      io.in("server:" + req.server.server_id).emit('server:remove_channel', {channelID, server_id: server.server_id});
      res.json({channelID, server_id: server.server_id})
    } catch(e) {
      return res.status(403).json({message: "Something went wrong. Try again later."})
    }
    
  },
  updateServer: async (req, res) => {

    // check if this function is executed by the guild owner.
    if (!req.server.creator.equals(req.user._id))
      return res.status(403).json({ message: "You do not have permission to update this server!" });


    const oauth2Client = req.oauth2Client;
    // filtered data
    const data = matchedData(req);

    if (data.avatar && oauth2Client) {
      const {ok, error, result} = await uploadAvatar(data.avatar, oauth2Client, res, req);
      if (!ok) {
        return res.status(403).json({message: "Something went wrong while uploading to google drive. Please try again later."})
      }
      delete data.avatar;
      data.avatar = result.data.id
      
    }
    const server = req.server;
    try {
      await Servers.updateOne({server_id: server.server_id}, data);
      const io = req.io;
      io.in("server:" + req.server.server_id).emit('server:update_server', Object.assign(data, {server_id: server.server_id}));
      res.json(Object.assign(data, {server_id: server.server_id}));
    } catch (e) {
      res.status(403).json({message: 'Something went wrong. Try again later.'})
    }
  }
}

function generateString(n) {
  var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
  var string_length = n;
  var randomstring = "";
  for (var i = 0; i < string_length; i++) {
    var rnum = Math.floor(Math.random() * chars.length);
    randomstring += chars.substring(rnum, rnum + 1);
  }
  return randomstring;
}

function generateNum(n) {
  var add = 1,
    max = 12 - add; // 15 is the min safe number Math.random() can generate without it starting to pad the end with zeros.

  if (n > max) {
    return generateNum(max) + generateNum(n - max);
  }
  max = Math.pow(10, n + add);
  var min = max / 10; // Math.pow(10, n) basically
  var number = Math.floor(Math.random() * (max - min + 1)) + min;

  return ("" + number).substring(add);
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