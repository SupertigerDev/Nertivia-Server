import { Channels } from "../models/Channels"

export const getChannelById = async (id: string) => {
  return Channels.findOne({channelID: id});
}