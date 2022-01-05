import {Themes} from '../../models/Themes';


module.exports = async (req, res, next) => {
  const { name, css, client_version } = req.body;
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
      css: css,
      client_version
    },
    { upsert: true }
  );
  res.json({name, css, id, client_version});
};
