const Themes = require("../../models/themes");

module.exports = async (req, res, next) => {
  const _id = req.user._id;
  const themes = await Themes.find({creator: _id}, {_id: 0}).select('name id client_version');
  res.json(themes);
};
