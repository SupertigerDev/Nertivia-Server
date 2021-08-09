const Channels = require("../../../models/channels");
const { addChannel } = require("../../../newRedisWrapper");
const redis = require("../../../redis");

module.exports = async (req, res, next) => {

  const data = req.body;
  const server = req.server;
  const channelID = req.params.channel_id;

  try {
    const dataFiltered = {
      name: data.name,
      icon: data.icon
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

    await Channels.updateOne({ channelID }, dataFiltered);
    const io = req.io;
    io.in("server:" + req.server.server_id).emit("server:update_channel", Object.assign({}, dataFiltered, {channelID}) );
    res.json(Object.assign({}, dataFiltered, {channelID}));
    // update in cache
    updateChannelCache(dataFiltered, channelID)
  } catch (e) {
    res.status(403).json({ message: "Something went wrong. Try again later." });
  }
};

async function updateChannelCache(updateData, channelID) {
  const {ok, result, error} = await redis.getServerChannel(channelID);
  if (!result) return;
  let channel = JSON.parse(result);
  const updateChannel = Object.assign({}, channel, updateData);
  await addChannel(channelID, updateChannel);

}
