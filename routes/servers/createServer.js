
// Models
const ServerMembers = require("../../models/ServerMembers");
const Channels = require("../../models/channels");
const Servers = require("../../models/servers");
const User = require("../../models/users");

// Imports
const FlakeId = require('flakeid');
const flake = new FlakeId();

module.exports = async (req, res, next) => {
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
  };
  serverMember.server_id = createServer.server_id;

  io.in(req.user.uniqueID).emit("server:joined", createServerObj);
  io.in(req.user.uniqueID).emit("server:member_add", {
    serverMember: serverMember
  });
  // join room
  const room = io.sockets.adapter.rooms[req.user.uniqueID];
  if (room)
    for (let clientId in room.sockets || []) {
      io.sockets.connected[clientId].join("server:" + createServer.server_id);
    }
};
