import { Users } from "../models/Users"

export const getUsersByIds = async (userIds: string[]) => {
  if (!userIds.length) return [];
  return Users.find({id: {$in: userIds}}).select('_id id avatar tag username')
}