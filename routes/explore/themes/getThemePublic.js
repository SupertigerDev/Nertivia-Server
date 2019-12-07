const Express = require("express");
const Themes = require('../../../models/themes');
const PublicThemes = require('../../../models/publicThemes');


/** @type {Express.RequestHandler} */
module.exports = async (req, res, next) => {

  const themeID = req.params.id;

  const theme = await Themes.findOne({id: themeID, creator: req.user._id});
  if (!theme) {
    return res.status(404).json({message: 'Invalid theme id.'});
  }

  const publicTheme = await PublicThemes.findOne({theme: theme._id}, {_id: 0}).select('id description screenshot approved css updatedCss').lean();
  if (!publicTheme) {
    return res.status(404).json({message: 'Invalid theme id.'});
  }

  publicTheme.updatedCss = !!publicTheme.updatedCss;

  res.json(publicTheme)
};