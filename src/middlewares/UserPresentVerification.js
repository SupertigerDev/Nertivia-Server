import {Channels} from "../models/Channels";
import {Servers} from "../models/Servers";
import { ServerRoles } from "../models/ServerRoles";
import {ServerMembers} from "../models/ServerMembers";
const redis = require("../redis");
const { getServerChannel, addServer, getServer, addChannel } = require("../newRedisWrapper");
//check if user is in the server.
module.exports = async (req, res, next) => {
  const serverID = req.params.server_id;
  const channelId = req.params.channel_id || req.params.channelId;

  


  // check if server is in cache
  const cacheServer = JSON.parse((await getServer(serverID))[0] || null);

  if (cacheServer) {
    // check if member is in cache
    const cacheMember = JSON.parse((await redis.getServerMember(req.user.id, serverID)).result || null);
    if (cacheMember) {
      req.permissions = cacheMember.permissions;
      req.highestRolePosition = cacheMember.highestRolePosition;
      req.server = cacheServer;
      if (channelId) {
        // check if channel is in cache
        const cacheChannel = JSON.parse((await getServerChannel(channelId))[0] || null);
        if (cacheChannel && cacheChannel.server_id && cacheChannel.server_id === serverID) {
          req.channel = cacheChannel;
          return next()
        }
      } else {
        return next();
      }
    }
  }





  const server = await Servers.findOne({ server_id: serverID }).select("+verified").lean();
  if (!server) {
    return res.status(404).json({
      message: "Server doesn't exist!"
    });
  }
  await addServer(server.server_id, server);

  const member = await ServerMembers.findOne({
    server: server._id,
    member: req.user._id
  }, {_id: 0}).select('roles').lean();

  if (!member){
    return res.status(404).json({
      message: "Member doesn't exist in the server!"
    });
  }

  let permissions = 0;
  let highestRolePosition = 0;

  if (member.roles && member.roles.length) {
    const roles = await ServerRoles.find({id: {$in: member.roles}}, {_id: 0}).select('permissions order').lean();
    highestRolePosition = Math.min(...roles.map(r => r.order));

    for (let index = 0; index < roles.length; index++) {
      const perm = roles[index].permissions;
      if (perm) {
        permissions = permissions | perm;
      }
    }
  }

  // add default role
  const defaultRole = await ServerRoles.findOne({default: true, server: server._id}, {_id: 0}).select('permissions').lean();
  permissions = permissions| defaultRole.permissions;

  req.permissions = permissions;
  req.highestRolePosition = highestRolePosition;
  await redis.addServerMember(req.user.id, server.server_id, JSON.stringify({permissions, highestRolePosition}));
  

  if (channelId) {
    // check if channel exists in the server
    const channel = await Channels.findOne({server_id: serverID, channelId: channelId}).lean()
    if (!channel) {
      return res.status(404).json({
        message: "ChannelID is invalid or does not exist in the server."
      });
    }
    await addChannel(channelId, Object.assign({}, channel, {server: undefined, server_id: server.server_id}), req.user.id );
    req.channel = channel;
  }

  // used to convert ObjectID to string
  req.server = JSON.parse(JSON.stringify(server));
  next();
};
