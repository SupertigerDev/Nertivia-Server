import {Channels} from "../../../models/Channels";
import { SERVER_CHANNEL_UPDATED } from "../../../ServerEventNames";
const { addChannel, getServerChannel } = require("../../../newRedisWrapper");
const redis = require("../../../redis");

module.exports = async (req, res, next) => {

  const data = req.body;
  const server = req.server;
  const channelId = req.params.channel_id;

  try {
    const dataFiltered = {
      name: data.name,
      icon: data.icon
    }
    const isGif = dataFiltered.icon?.startsWith("g_")
    const isCustom = dataFiltered.icon?.startsWith("c_")
    if (isGif || isCustom) {
      const emojiId = dataFiltered.icon.split("_")[1];
      if (/^\d+$/.test(emojiId) === false) {
        res.status(403).json({ message: "Invalid Emoji Id" });
        return;
      }
    }
    if (data.permissions) {
      dataFiltered.permissions = data.permissions
    }
    if (data.rateLimit !== undefined) {
      if (typeof data.rateLimit !== "number") {
        res.status(403).json({ message: "Rate limit must be type number." });
        return;
      } 
      if (data.rateLimit > 600) {
        res.status(403).json({ message: "Max rate limit: 600 seconds." });
        return;
      }
      if (data.rateLimit < 0) {
        res.status(403).json({ message: "Min rate limit: 0 seconds." });
        return;
      }
      dataFiltered.rateLimit = data.rateLimit;
    }

    if (!dataFiltered.name || !dataFiltered.name.trim()) {
      delete dataFiltered.name;
    }

    await Channels.updateOne({ channelId }, dataFiltered);
    const io = req.io;
    io.in("server:" + req.server.server_id).emit(SERVER_CHANNEL_UPDATED, Object.assign({}, dataFiltered, {channelId}) );
    res.json(Object.assign({}, dataFiltered, {channelId}));
    // update in cache
    updateChannelCache(dataFiltered, channelId)
  } catch (e) {
    res.status(403).json({ message: "Something went wrong. Try again later." });
  }
};

async function updateChannelCache(updateData, channelId) {
  const [result, err] = await getServerChannel(channelId);
  if (!result) return;
  let channel = JSON.parse(result);
  const updateChannel = Object.assign({}, channel, updateData);
  await addChannel(channelId, updateChannel);

}
