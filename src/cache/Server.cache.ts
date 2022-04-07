
import * as keys from './keys.cache';
import {client as redis} from '../common/redis';
import { Server, Servers } from '../models/Servers';

export async function addServer(serverId: string, data: any) {
  const key = keys.serverString(serverId)
  await redis.setNX(key, JSON.stringify(data));
}


// get or cache server.
export async function getServer(serverId: string): Promise<Server | null> {
  const key = keys.serverString(serverId)
  const stringifiedServer = await redis.get(key);
  if (stringifiedServer) return JSON.parse(stringifiedServer);

  // check in database.
  const server = await Servers.findOne({server_id: serverId}).select("+verified")
  if (!server) return null;
  const serverStringified = JSON.stringify(server);
  await addServer(serverId, server);
  return JSON.parse(serverStringified);
}
export async function deleteServer(serverId: string) {
  const key = keys.serverString(serverId)
  await redis.del(key);
}