import mongoose from "mongoose";
import { ServerMembers } from "../models/ServerMembers"
import { ServerRoles } from "../models/ServerRoles"
import { User } from "../models/Users";


export const getLastSeenServerChannels = async (userObjectId: mongoose.Types.ObjectId | string) => {
  const members = await ServerMembers.find({
    member: userObjectId,
    last_seen_channels: { $exists: true, $not: { $size: 0 } }
  }).select("last_seen_channels").lean();

  let lastSeenServerChannels: Record<string, number> = {};
  for (let index = 0; index < members.length; index++) {
    const member = members[index];
    const lastSeenChannels = member.last_seen_channels;
    lastSeenServerChannels = {...lastSeenServerChannels, ...lastSeenChannels}
  }
  return lastSeenServerChannels;
}

export const getMembersByServerObjectIds = async (serverObjectIds: mongoose.Types.ObjectId[] | string[]) => {
  return await ServerMembers.find(
    { server: { $in: serverObjectIds } },
  )
    .select("-_id +roles")
    .populate<{member: User}>({
      path: "member",
      select: "username tag avatar id member -_id bot botPrefix"
    })
}


interface LastSeenOptions {
  channelId: string
  serverObjectId: string,
  memberObjectId: string,
  date: number,
}

export const updateMemberLastSeen = (options: LastSeenOptions) => {
  return ServerMembers.updateOne({server: options.serverObjectId, member: options.memberObjectId}, {
    $set: {
        [`last_seen_channels.${options.channelId}`] : options.date + 1
    }
  })
}


interface UnmutedServerChannelMembers {
  serverObjectId: string,
  channelId: string,
  userObjectIds: string[]
}

// filter out members that have muted notifications from the channel or the server and return the id.
export const unmutedServerChannelMembers = async (opts: UnmutedServerChannelMembers): Promise<string[]> => {
  let serverMembers = await ServerMembers.find({ 
    muted_channels: { 
      $ne: opts.channelId
    }, 
    muted: { $ne: 2 }, 
    server: opts.serverObjectId, 
    member: {
      $in: opts.userObjectIds
    }
  }).select("member").populate("member", "id")
  const memberIds = serverMembers.map(serverMember => serverMember.member.id)
  return memberIds;
}


interface PermissionDetails {
  permissions: number,
  highestRolePosition: number
}

export const memberPermissionDetails = async (serverObjectId: string, userObjectId: string): Promise<[PermissionDetails | null, string | null]> => {
  const member = await ServerMembers.findOne({server: serverObjectId, member: userObjectId}).select('-_id roles')
  if (!member) {
    return [null, "You are not in that server."]
  }

  
  let permissions = 0;
  // decides if user with lower role is allowed to modify higher roles.
  let highestRolePosition = 0;
  
  if (member.roles?.length) {
    const roles = await ServerRoles.find({id: {$in: member.roles}}).select('-_id permissions order').lean();
    highestRolePosition = Math.min(...roles.map(r => r.order));
    for (let index = 0; index < roles.length; index++) { 
      const perm = roles[index].permissions;
      if (!perm) continue;
      permissions = permissions | perm;
    }
  }

  const defaultRole = await ServerRoles.findOne({default: true, server: serverObjectId}).select('-_id permissions').lean();
  permissions = permissions | defaultRole!.permissions;
  return [{permissions, highestRolePosition}, null];
  
} 


// Muted servers and server channels
export const mutedServersAndChannels = async (userObjectId: string | mongoose.Types.ObjectId) => {
  const results = await ServerMembers.find(
    {
      member: userObjectId,
      $or: [
        { muted_channels: { $exists: true, $not: { $size: 0 } } },
        { muted: { $exists: true, $ne: 0 } }
      ]
    }
  ).select("muted_channels muted server_id");

  let mutedChannels: string[] = [];
  let mutedServers = [];

  for (let index = 0; index < results.length; index++) {
    const member = results[index]
    if (member.muted_channels?.length) {
      mutedChannels = [...mutedChannels, ...member.muted_channels]
    }
    if (member.muted) {
      mutedServers.push({ muted: member.muted, server_id: member.server_id });
    }
  }
  return {mutedChannels, mutedServers};
}