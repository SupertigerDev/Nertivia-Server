const Channels = require("../../../models/channels");
const User = require("../../../models/users");
const ServerInvites = require("../../../models/ServerInvites");
const Messages = require("../../../models/messages");
const ServerMembers = require("../../../models/ServerMembers");
const publicServersList = require("../../../models/publicServersList");
const Servers = require("../../../models/servers");
const ServerRoles = require("../../../models/Roles");
const redis = require("./../../../redis");
const sendMessageNotification = require('./../../../utils/SendMessageNotification')

module.exports = async (req, res, next) => {
  const {invite_code, server_id} = req.params;
  const {socketID} = req.body;

  let invite, server;


  if (invite_code){
    // Find invite
    invite = await ServerInvites.findOne({ invite_code })
    .populate({ path: "server", populate: [{ path: "creator" }] })
    .lean();
    // check if banned
    const checkBanned = await Servers.findOne({
      _id: invite.server._id,
      "user_bans.user":
      {
        "$ne": req.user._id
      }
    }) 
    if (!checkBanned)  invite = undefined;
  } else if (server_id) {
    server = await Servers.findOne({
      server_id: server_id,
      "user_bans.user":
      {
        "$ne": req.user._id
      }
    }).populate('creator').lean();
    // check if server is in public list
    if (server) {
      const checkPublicList = await publicServersList.findOne({server: server._id});
      if (!checkPublicList) {
        return res.status(403).json({ message: "Server is not public." });
      }

    }
  }

  if (!invite && !server) return res.status(404).json({ message: "Invalid server." });
  join(server || invite.server)

  async function join(server) {
    // check if user is already joined
    const joined = await User.findOne({
      _id: req.user._id,
      servers: server._id
    });
  
    if (joined) return res.status(409).json({ message: "Already joined!" });
  
    const addServerUser = await User.updateOne(
      { _id: req.user._id },
      { $push: { servers: server._id } }
    );
    const addServerMember = await ServerMembers.create({
      server: server._id,
      member: req.user._id,
      server_id: server.server_id,
    });
    let serverChannels = await Channels.find({
      server: server._id
    }).lean();
  
    const createServerObj = Object.assign({}, server);
    createServerObj.creator = { uniqueID: createServerObj.creator.uniqueID };
    createServerObj.__v = undefined;
    createServerObj._id = undefined;
    res.json(createServerObj);
  
    const io = req.io;
  
    const serverMember = {
      server_id: server.server_id,
      type: "MEMBER",
      member: {
        username: req.user.username,
        tag: req.user.tag,
        avatar: req.user.avatar,
        uniqueID: req.user.uniqueID
      }
    };
    // get user presence
    const presence = await redis.getPresence(serverMember.member.uniqueID);
    io.in("server:" + server.server_id).emit("server:member_add", {
      serverMember,
      presence: presence.result[1]
    });
  
    // send owns status to every connected device
    createServerObj.channels = serverChannels;

    io.in(req.user.uniqueID).emit("server:joined", Object.assign({}, createServerObj, {socketID}));
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
      channelID: server.default_channel_id,
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


    // save notification 
    await sendMessageNotification({
      message: messageCreated,
      channelID: server.default_channel_id,
      server_id: server._id,
      sender: req.user,
    })


    // emit message
    const serverRooms =
      io.sockets.adapter.rooms["server:" + createServerObj.server_id];
    if (serverRooms) {
      for (let clientId in serverRooms.sockets || []) {
        io.to(clientId).emit("receiveMessage", {
          message: messageCreated
        });
      }
    }


    // send roles
    let serverRoles = await ServerRoles.find(
      {server: server._id},
      {_id: 0}
    ).select("name id color permissions server_id deletable order default")
    
    io.to(req.user.uniqueID).emit("server:roles", {
      server_id: server.server_id,
      roles: serverRoles,
    });

    // send members list
    let serverMembers = await ServerMembers.find({ server: server._id })
      .populate("member")
      .lean();
  
    const memberPresences = await redis.getPresences(
      serverMembers.map(sm => sm.member.uniqueID)
    );
    serverMembers = serverMembers.map(sm => {
      delete sm.server;
      delete sm._id;
      delete sm.__v;
      sm.member = {
        username: sm.member.username,
        tag: sm.member.tag,
        avatar: sm.member.avatar,
        uniqueID: sm.member.uniqueID
      };
      sm.server_id = server.server_id;
      return sm;
    });
    io.to(req.user.uniqueID).emit("server:members", {
      serverMembers,
      memberPresences: memberPresences.result.filter(s => s[0] !== null && s[1] !== "0")
    });
  }  
};

