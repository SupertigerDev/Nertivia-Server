import mongoose from "mongoose";
import { ServerRoles } from "../models/ServerRoles";




export const getRolesByServerObjectIds = async (serverObjectIds: mongoose.Types.ObjectId[] | string[]) => {
  return await ServerRoles.find(
    { server: { $in: serverObjectIds } }
  ).select('-_id').lean()
}