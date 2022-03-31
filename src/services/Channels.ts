import mongoose from "mongoose";
import { Channels } from "../models/Channels"
import { User } from "../models/Users";

export const getChannelsByServerObjectIds = async (serverObjectIds: mongoose.Types.ObjectId[] | string[]) => {
  return await Channels
  .find({ server: { $in: serverObjectIds } })
  .lean();
}
export const getChannelById = async (id: string) => {
  return Channels.findOne({channelId: id});
}


export const getOpenedDmChannels = (userObjectId: mongoose.Types.ObjectId | string) =>  {
  return Channels
  .find({ creator: userObjectId, hide: { $ne: true } })
  .select("-_id recipients channelId lastMessaged")
  .populate<{recipients: User[]}>({
    path: "recipients",
    select: "avatar username id tag bot -_id"
  })
  .lean();
}

export const updateLastMessaged = async (channelId: string) => {
  const date = Date.now();
  await Channels.updateMany({ channelId: channelId }, { $set: {
    lastMessaged: date
  }})
  return date;
}