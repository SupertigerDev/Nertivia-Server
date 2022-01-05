import {Themes} from '../../models/Themes';


module.exports = async (req, res, next) => {
  const { id } = req.params;
  const _id = req.user._id;

  const themes = await Themes.findOne({id: id}, {_id: 0}).select('name id css client_version');
  if (!themes) {
    return res.status(404).json({message: "Theme doesn't exist!"})
  }
  res.json(themes);
};
