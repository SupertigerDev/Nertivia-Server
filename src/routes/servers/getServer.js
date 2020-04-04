const Servers = require("../../models/servers");
const Channels = require("../../models/channels");

const GDriveApi = require("./../../API/GDrive");
const stream = require("stream");

const { matchedData } = require("express-validator/filter");
const FlakeId = require("flakeid");
const flake = new FlakeId();
const cropImage = require('../../utils/cropImage');

module.exports = async (req, res, next) => {
 res.json({
   name: req.server.name,
   avatar: req.server.avatar,
   default_channel_id: req.server.default_channel_id,
   server_id: req.server.server_id,
   created: req.server.created,
   banner: req.server.banner,
 })
}
