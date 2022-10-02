import { Request, Response, NextFunction } from "express";

import * as ServerCache from '../cache/Server.cache';
import * as ServerMemberCache from '../cache/ServerMember.cache';

//check if user is in the server.
export async function serverMemberVerify(req: Request, res: Response, next: NextFunction) {
  // TODO: replace :server_id with serverId.
  const serverId = req.params.server_id;
  

  const server = await ServerCache.getServer(serverId);
  if (!server) return res.status(404).send("Invalid server id.");

  const [member, error] = await ServerMemberCache.getServerMember({
    serverId: server.server_id,
    serverObjectId: server._id,
    userId: req.user.id,
    userObjectId: req.user._id
  })
  if (error || !member) {
    return res.status(403).json({message: error});
  }
  
  req.server = server;
  req.member = member;
  next(); 
};
