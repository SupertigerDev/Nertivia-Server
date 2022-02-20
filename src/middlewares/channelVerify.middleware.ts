import {Request, Response, NextFunction } from 'express';

import * as ChannelCache from '../cache/Channel.cache' 
import * as ServerMemberCache from '../cache/ServerMember.cache'

export async function channelVerify(req: Request, res: Response, next: NextFunction) {

  let { channelId } = req.params;

  const [channel, error] = await ChannelCache.getChannel(req.user._id!, req.user.id, channelId);
  if (error) {
    return res.status(403).json({message: error});
  }
  req.channel = channel;
  
  if (req.channel.server) {
    req.server = req.channel.server;
    const [member, error] = await ServerMemberCache.getServerMember({
      serverObjectId: req.server._id,
      serverId: req.server.server_id,
      userId: req.user.id,
      userObjectId: req.user._id
    })
    if (error || !member) {
      return res.status(403).json({message: error});
    }
    req.member = member;
  }
  next();
}