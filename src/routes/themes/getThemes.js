const Users = require("../../models/users");
const Themes = require("../../models/themes");

const FlakeId = require('flakeid');
const flake = new FlakeId({
  timeOffset : (2013-1970)*31536000*1000,
});

module.exports = async (req, res, next) => {
  const _id = req.user._id;
  const themes = await Themes.find({creator: _id}, {_id: 0}).select('name id');
  res.json(themes);
};
