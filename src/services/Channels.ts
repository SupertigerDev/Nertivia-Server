import { Channels } from "../models/Channels"

export const getChannelById = async (id: string) => {
  return Channels.findOne({channelId: id});
}

export const updateLastMessaged = async (channelId: string) => {
  const date = Date.now();
  await Channels.updateMany({ channelId: channelId }, { $set: {
    lastMessaged: date
  }})
  return date;
}