import { Users } from "../models/Users"
// this function should be used internally.
export const getUserByIdUnsafe = (userId: string) => {
  // todo: add unsafe fields.
  return Users.findOne({id: userId}).select('_id id avatar tag badges banned username bot readTerms passwordVersion ip GDriveRefreshToken')
}

export const getUsersByIds = async (userIds: string[]) => {
  if (!userIds.length) return [];
  return Users.find({id: {$in: userIds}}).select('_id id avatar tag username')
}