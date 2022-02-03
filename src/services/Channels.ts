import { Channels } from "../models/Channels"

export const getChannelById = async (id: string) => {
  return Channels.findOne({channelID: id});
}

export const updateLastMessaged = async (channelId: string) => {
  const date = Date.now();
  await Channels.updateMany({ channelID: channelId }, { $set: {
    lastMessaged: date
  }})
  return date;
}