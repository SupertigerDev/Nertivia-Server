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