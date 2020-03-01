const Users = require("../../models/users");
const Themes = require("../../models/themes");
const PublicThemes = require("../../models/publicThemes");


module.exports = async (req, res, next) => {
  const { id } = req.params;
  const _id = req.user._id;


  // check if theme exists
  const exists = await Themes.findOne({ id, creator: _id }).select(
    "name id"
  );
  if (!exists) {
    res.status(404).json({ message: "Theme does not exist!" });
  }

  await Themes.deleteOne({id});
  await PublicThemes.deleteOne({theme: exists._id});


  res.json({message: 'deleted'});
};
