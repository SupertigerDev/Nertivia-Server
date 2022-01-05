const Express = require("express");
import {Themes} from '../../../models/Themes';

import {PublicThemes} from '../../../models/PublicThemes'


/** @type {Express.RequestHandler} */
module.exports = async (req, res, next) => {
  const getCSS = req.query.css;

  const themeID = req.params.id;

  const theme = await Themes.findOne({id: themeID});
  if (!theme) {
    return res.status(404).json({message: 'Invalid theme id.'});
  }

  let select = 'id description screenshot compatible_client_version approved css updatedCss';
  if (getCSS === "false") {
    select = 'id description screenshot compatible_client_version approved updatedCss'
  }  

  const publicTheme = await PublicThemes.findOne({theme: theme._id}, {_id: 0}).select(select).lean();
  if (!publicTheme) {
    return res.status(404).json({message: 'Invalid theme id.'});
  }
  if (!publicTheme.approved && theme.creator.toString() !== req.user._id) {
    return res.status(404).json({message: 'Theme is not approved.'});
  }

  publicTheme.updatedCss = !!publicTheme.updatedCss;

  res.json({...publicTheme, name: theme.name})
};