import {Channels} from "../../../models/Channels";

module.exports = async (req, res, next) => {
  // find all channels
  const channels = await Channels.find({ server: req.server._id });
  res.json(channels);
};
