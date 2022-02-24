import {Channels, ChannelType} from "../models/Channels";
import { ServerRoles } from "../models/ServerRoles";
import {ServerMembers} from "../models/ServerMembers";
import {BlockedUsers} from "../models/BlockedUsers";

const redis = require("../redis");
const { getDmChannel, getServerChannel, addServer, getServer, addChannel } = require("../newRedisWrapper");

module.exports = async (req, res, next) => {

  const { channelId } = req.params;

  // check if exists in redis
  // check dm channel
  const [dmChannel] = await getDmChannel(channelId, req.user.id);
  
  if (dmChannel) {
    const channel = JSON.parse(dmChannel);
    req.channel = channel;
    next();
    return;
  }
  // check server
  const [serverChannel] = await getServerChannel(channelId);
  if (serverChannel) {
    const channel = JSON.parse(serverChannel);
    if (channel.type !== ChannelType.SERVER_CHANNEL) {
      return res.status(403).json({
        message: "Channel is not a server channel."
      });
    }
    //check if member in server
    let isInServer = await redis.getServerMember(req.user.id, channel.server_id);
    if (isInServer.result) {
      const data = JSON.parse(isInServer.result);
      req.channel = channel;
      req.permissions = data.permissions
      req.highestRolePosition = data.highestRolePosition;

      // get server
      const [server] = await getServer(channel.server_id);
      if (server) {
        req.channel.server = JSON.parse(server);
        next();
        return;
      }
    }
  }
  
  // check in database

  const channel = await Channels.findOne({
    channelId,
    creator: {$in: [null,req.user._id]}
  }).populate([
    {path: 'recipients'},
    {path: 'server', select: "+verified"}
  ])
  .lean()

  if (!channel) {
    return res.status(404).json({
      message: "Channel doesn't exist."
    });
  }

  if (channel.server) {

    // check if member is in server.
    const member = await ServerMembers.findOne({server: channel.server._id, member: req.user._id}, {_id: 0}).select('roles')
    if (!member) {
      return res.status(403).json({
        message: "You have not joined that server."
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
    const defaultRole = await ServerRoles.findOne({default: true, server: channel.server._id}, {_id: 0}).select('permissions').lean();
    permissions = permissions| defaultRole.permissions;

    req.channel = channel;
    req.permissions = permissions;
    req.highestRolePosition = highestRolePosition;
    next();
    await redis.addServerMember(req.user.id, channel.server.server_id, JSON.stringify({permissions, highestRolePosition}));

    await addServer(channel.server.server_id, channel.server);

  
    	
    await addChannel(channelId, Object.assign({}, channel, {server: undefined, server_id: channel.server.server_id}), req.user.id);
  } else {

    // check if blocked by recipient.
    const requester = req.user;
    const recipient = channel.recipients[0];

    const isBlocked = await BlockedUsers.exists({$or: [
      {requester: requester._id, recipient: recipient._id},
      {requester: recipient._id, recipient: requester._id}
    ]})

    const newChannel = {...channel, isBlocked}

    req.channel = newChannel;
    next();
    await addChannel(channelId, newChannel, req.user.id);
  }
};