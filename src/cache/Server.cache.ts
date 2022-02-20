
import * as keys from './keys.cache';
import {client as redis} from '../common/redis';

export async function addServer(serverId: string, data: any) {
  const key = keys.serverString(serverId)
  await redis.setNX(key, JSON.stringify(data));
}
export async function getServer(serverId: string) {
  const key = keys.serverString(serverId)
  const stringifiedServer = await redis.get(key);
  if (!stringifiedServer) return null;
  return JSON.parse(stringifiedServer);
}