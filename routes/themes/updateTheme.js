const Users = require("../../models/users");
const Themes = require("../../models/themes");

module.exports = async (req, res, next) => {
  const { name, css } = req.body;
  const { id } = req.params;
  const _id = req.user._id;

  // check if theme exists
  const exists = await Themes.findOne({ id, creator: _id }, { _id: 0 }).select(
    "name id"
  );
  if (!exists) {
    res.status(404).json({ message: "Theme does not exist!" });
  }
  // update in database
  const saved = await Themes.updateOne(
    { id },
    {
      name: name,
      css: css
    },
    { upsert: true }
  );
  res.json({name, css, id});
};
