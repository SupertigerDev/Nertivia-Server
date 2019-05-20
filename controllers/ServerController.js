const Servers = require("../models/servers");
const Channels = require("../models/channels");
const User = require("../models/users");
const ServerInvites = require("../models/ServerInvites");
const Messages = require("../models/messages");
const ServerMembers = require("../models/ServerMembers");
const mongoose = require("mongoose");

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

    const createServer = await Servers.create({
      name: name.trim(),
      creator: user_id,
    });

    const createServerObj = createServer.toObject();

    const createChannel = await Channels.create({
      name: "General",
      channelID: generateNum(19),
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
    })

    createServerObj.creator = {uniqueID: req.user.uniqueID};
    createServerObj.__v = undefined;
    createServerObj._id = undefined;
    res.json(createServerObj);

    const io = req.io;
    // send owns status to every connected device
    io.in(req.user.uniqueID).emit("server:joined", createServerObj);
    // join room
    const clients = io.sockets.adapter.rooms[req.user.uniqueID].sockets;
    for (let clientId in clients) {
      io.sockets.connected[clientId].join('server:' + createServer.server_id)
    }
  },
  getChannels: async (req, res) => {
    // find all channels
    const channels = await Channels.find({ server: req.server._id });
    res.json(channels);
  },
  createInvite: async (req, res) => {
    const inviteCode = generateString(6);

    const create = await ServerInvites.create({
      server: req.server._id,
      creator: req.user._id,
      invite_code: inviteCode
    });

    res.json({ invite_code: inviteCode });
  },
  getInvites: async (req, res) => {
    const invites = await ServerInvites.find({server: req.server._id, creator: req.user._id});
    res.json(invites)
  },
  getInviteDetail: async (req, res) => {
    const inviteCode = req.params.invite_code

    // Find invite
    const invite = await ServerInvites.findOne({invite_code: inviteCode}).populate('server').lean();

    if (!invite) {
      return res.status(404).json({message: "Invalid invite."})
    }

    res.json(invite.server)

  },
  joinServer: async (req, res) => {
    const inviteCode = req.params.invite_code;

    // Find invite
    const invite = await ServerInvites.findOne({invite_code: inviteCode}).populate({path: 'server', populate: [{path: 'creator'}]}).lean();

    if (!invite) 
      return res.status(404).json({message: "Invalid invite."})
    
    // check if user is already joined
    const joined = await User.findOne({_id: req.user._id, servers: invite.server._id});

    if (joined) 
      return res.status(403).json({message: "Already joined!"})

      const addServerUser = await User.updateOne(
        { _id: req.user._id },
        { $push: { servers: invite.server._id } }
      );
      const addServerMember = await ServerMembers.create({
        server: invite.server._id,
        member: req.user._id
      })

      
      const createServerObj = invite.server;
      createServerObj.creator = {uniqueID: createServerObj.creator.uniqueID};
      createServerObj.__v = undefined;
      createServerObj._id = undefined;
      res.json(createServerObj);
  
      const io = req.io;
      // send owns status to every connected device
      io.in(req.user.uniqueID).emit("server:joined", createServerObj);
      // join room
      const clients = io.sockets.adapter.rooms[req.user.uniqueID].sockets;
      for (let clientId in clients) {
        io.sockets.connected[clientId].join('server:' + createServerObj.server_id)
      }
  },
  deleteLeaveServer: async (req, res) => {

    // check if its the creator and delete the server.
    if (req.server.creator.equals(req.user._id)) {
      await Servers.deleteOne({ _id: req.server._id })
      const channels = await Channels.find({ server: req.server._id });
      let channelIDArray = [];

      for (let index = 0; index < channels.length; index++) {
        const channel = channels[index];
        channelIDArray.push(channel.channelID);
      }
      if (channelIDArray) {
       await Messages.deleteMany({ channelID: { $in: channelIDArray}})
      }
      await Channels.deleteMany({ server: req.server._id });
      await ServerMembers.deleteMany({ server: req.server._id })
      await ServerInvites.deleteMany({ server: req.server._id })

      await User.updateMany({ $pullAll: { servers: [req.server._id] } } )

      //EMIT
      const io = req.io;
      const clients = io.sockets.adapter.rooms["server:" + req.server.server_id].sockets;
      for (let clientId in clients) {
        io.sockets.connected[clientId].emit("server:leave", {server_id: req.server.server_id});
        io.sockets.connected[clientId].leave("server:" + req.server.server_id)
      }
      return
    }
    // Leave server
    await User.updateMany({ $pullAll: { servers: [req.server._id] } } )
    await ServerMembers.deleteMany({ server: req.server._id })
    const io = req.io

    const clients = io.sockets.adapter.rooms[req.user.uniqueID].sockets;
    for (let clientId in clients) {
      io.sockets.connected[clientId].emit("server:leave", {server_id: req.server.server_id});
      io.sockets.connected[clientId].leave("server:" + req.server.server_id);
    }
  }
};





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
