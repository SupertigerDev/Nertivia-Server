
import {client as redis} from '../common/redis'
import * as keys from './keys.cache';
import * as ServerMembers from '../services/ServerMembers';
// just stores permission information for now.

export interface ServerMemberCache {
  permissions: number,
  highestRolePosition: number
}

interface GetServerMemberOptions {
  serverId: string, 
  serverObjectId: string, 
  userId: string, 
  userObjectId: string
}

export async function getServerMember(opts: GetServerMemberOptions): Promise<[ServerMemberCache | null, string | null]> {
  // check in cache first
  const key = keys.serverMemberHash(opts.serverId);
  const stringifiedMember = await redis.hGet(key, opts.userId);
  if (stringifiedMember) {
    return [JSON.parse(stringifiedMember), null]
  }

  // check in database
  const [member, error] = await ServerMembers.memberPermissionDetails(opts.serverObjectId, opts.userObjectId);

  if (error || !member) {
    return [null, error];
  }
  redis.hSet(key, opts.userId, JSON.stringify(member));
  return [member, null];
}

export async function removeServerMember(serverId: string, userId: string) {
  const key = keys.serverMemberHash(serverId);
  await redis.hDel(key, userId);
}
export async function deleteAllServerMembers(serverId: string) {
  const key = keys.serverMemberHash(serverId);
  await redis.del(key);
}