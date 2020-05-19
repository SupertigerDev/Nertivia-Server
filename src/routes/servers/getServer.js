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
