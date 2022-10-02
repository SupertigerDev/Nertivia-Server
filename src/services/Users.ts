import { User, Users } from "../models/Users"
import {Server, Servers} from '../models/Servers'
import {Friend} from '../models/Friends'
import mongoose from "mongoose"
import { BlockedUsers } from "../models/BlockedUsers"

// This function should be used internally, only in User.cache.ts
export const getUserForCache = (userId: string) => {
  return Users.findOne({id: userId}).select('_id id type avatar tag badges banned username bot readTerms passwordVersion ip GDriveRefreshToken')
}

// this function should only be used internally, only in authentication.event.ts
export const getUserForSocketAuth = async (userId: string) => {
  const user = await Users.findOne({ id: userId })
    .select("avatar banner username type badges email id tag settings servers show_welcome GDriveRefreshToken status custom_status email_confirm_code banned bot passwordVersion readTerms")
    .populate<{friends: (Friend & {recipient: User})[]}>({
      path: "friends",
      populate: [
        {
          path: "recipient",
          select: "username id tag admin -_id avatar"
        }
      ],
      select: "recipient status -_id"
    })
    .populate<{servers: (Server & {creator: User})[]}>({
      path: "servers",
      populate: [
        {
          path: "creator",
          select: "id -_id"
        }
      ],
      select:
        "name creator default_channel_id server_id avatar banner channel_position verified"
    }).lean();

    
    return user;
}


export const getBlockedUserIds = async(userObjectId: string | mongoose.Types.ObjectId) => {
  const blockedUsers = await BlockedUsers.find({ requester: userObjectId }).populate<{recipient: User}>("recipient", "id").lean();
  const bannedUserIDs: string[] = blockedUsers.map(user => user.recipient.id)
  return bannedUserIDs;

}

export const getUsersByIds = async (userIds: string[]) => {
  if (!userIds.length) return [];
  return Users.find({id: {$in: userIds}}).select('_id id avatar tag username')
}

export const getCommonServerIds = async (userId: string, recipientId: string) => {
  const user = await Users.findOne({id: userId}).select("servers").lean();
  if (!user?.servers) return [];

  const recipient = await Users.findOne({id: recipientId}).select("servers").lean();
  if (!recipient?.servers) return [];
  const recipientServers = recipient.servers.map(serverObjectId => serverObjectId.toString());

  const commonServerObjectIds = user.servers.filter(serverObjectId => {
    return recipientServers.includes(serverObjectId.toString());
  })
  const commonServers = await Servers.find({_id: {$in: commonServerObjectIds}}).select("server_id");
  const commonServerIds = commonServers.map(server => server.server_id);
  return commonServerIds;
}