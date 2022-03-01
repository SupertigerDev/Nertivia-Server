import { User, Users } from "../models/Users"
import {Server} from '../models/Servers'
import {Friend} from '../models/Friends'

// This function should be used internally, only in User.cache.ts
export const getUserForCache = (userId: string) => {
  return Users.findOne({id: userId}).select('_id id avatar tag badges banned username bot readTerms passwordVersion ip GDriveRefreshToken')
}





const populateFriends = {
  path: "friends",
  populate: [
    {
      path: "recipient",
      select: "username id tag admin -_id avatar"
    }
  ],
  select: "recipient status -_id"
};
const populateServers = {
  path: "servers",
  populate: [
    {
      path: "creator",
      select: "id -_id"
    }
  ],
  select:
    "name creator default_channel_id server_id avatar banner channel_position verified"
};
// this function should only be used internally, only in authentication.event.ts
export const getUserForSocketAuth = async (userId: string) => {
  const user = await Users.findOne({ id: userId })
    .select("avatar banner username type badges email id tag settings servers show_welcome GDriveRefreshToken status custom_status email_confirm_code banned bot passwordVersion readTerms")
    .populate(populateFriends)
    .populate(populateServers)
    .lean();

    
    return user as User & {
      friends: Friend & {recipient: Partial<User>}[]
      servers: Partial<Server & {creator: Partial<User>}>[]
    }
}


export const getUsersByIds = async (userIds: string[]) => {
  if (!userIds.length) return [];
  return Users.find({id: {$in: userIds}}).select('_id id avatar tag username')
}