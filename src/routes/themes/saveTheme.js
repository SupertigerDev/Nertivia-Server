const Users = require("../../models/users");
const Themes = require("../../models/themes");

const flake = require('../../utils/genFlakeId').default;
module.exports = async (req, res, next) => {
  const { name, css, client_version } = req.body;
  const id = flake.gen();
  const _id = req.user._id;

  // check how many themes the user has made.
  const count = await Themes.countDocuments({creator: _id});

  if (count >= 30) {
    return res.status(403).json({message: 'Too many themes! (Max: 30)'})
  }
  const saved = await Themes.create({
    name, 
    css,
    id,
    client_version,
    creator: _id,
  })
  res.json(saved);
};
