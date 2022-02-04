import { ServerMembers } from "../models/ServerMembers"

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