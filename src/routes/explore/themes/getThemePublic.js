const Express = require("express");
const Themes = require('../../../models/themes');
const PublicThemes = require('../../../models/publicThemes');


/** @type {Express.RequestHandler} */
module.exports = async (req, res, next) => {
  const getCSS = req.query.css;

  const themeID = req.params.id;

  const theme = await Themes.findOne({id: themeID});
  if (!theme) {
    return res.status(404).json({message: 'Invalid theme id.'});
  }

  let select = 'id description screenshot approved css updatedCss';
  if (getCSS === "false") {
    select = 'id description screenshot approved updatedCss'
  }  

  const publicTheme = await PublicThemes.findOne({theme: theme._id, approved: true}, {_id: 0}).select(select).lean();
  if (!publicTheme) {
    return res.status(404).json({message: 'Invalid theme id.'});
  }

  publicTheme.updatedCss = !!publicTheme.updatedCss;

  res.json({...publicTheme, name: theme.name})
};