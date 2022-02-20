import { ServerMembers } from "../models/ServerMembers"
import { ServerRoles } from "../models/ServerRoles"

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
  const member = await ServerMembers.findOne({server: serverObjectId, member: userObjectId}, {_id: 0}).select('roles')
  if (!member) {
    return [null, "You are not in that server."]
  }

  
  let permissions = 0;
  // decides if user with lower role is allowed to modify higher roles.
  let highestRolePosition = 0;
  
  if (member.roles?.length) {
    const roles = await ServerRoles.find({id: {$in: member.roles}}, {_id: 0}).select('permissions order').lean();
    highestRolePosition = Math.min(...roles.map(r => r.order));
    for (let index = 0; index < roles.length; index++) { 
      const perm = roles[index].permissions;
      if (!perm) continue;
      permissions = permissions | perm;
    }
  }

  const defaultRole = await ServerRoles.findOne({default: true, server: serverObjectId}, {_id: 0}).select('permissions').lean();
  permissions = permissions | defaultRole!.permissions;
  return [{permissions, highestRolePosition}, null];
  
} 