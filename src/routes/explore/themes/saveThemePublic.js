const Express = require("express");
const uploadImage = require('../../../utils/uploadBase64Image');
const Themes = require('../../../models/themes');
const PublicThemes = require('../../../models/publicThemes');
const { matchedData } = require("express-validator/filter");

/** @type {Express.RequestHandler} */
module.exports = async (req, res, next) => {
  const oauth2Client = req.oauth2Client;
  const themeID = req.params.id;
  let data = matchedData(req);

  // check if theme exists
  const theme = await Themes.findOne({id: themeID, creator: req.user._id});
  if (!theme) {
    return res.status(404).json({message: 'id is invalid.'});
  }
  // check if public theme exists.
  const publicTheme = await PublicThemes.findOne({theme: theme._id});
  if (!publicTheme) {
    return res.status(403).json({message: 'Theme does not exist.'});
  }
  if (!oauth2Client) {
    return res.status(403).json({message: 'You must link your Google Drive to continue.'});
  }

  if (data.screenshot) {
    // 2092000 = 2mb
    const maxSize = 2092000;
    const {ok, error, result, message} = await uploadImage(data.screenshot, oauth2Client, maxSize, 'theme-screenshot-' + themeID);
    if (!ok) {
      return res.status(403).json({message});
    }
    data.screenshot = result.data.id;
  }

   

  try {
    let update;
    if (publicTheme.approved && (publicTheme.css !== theme.css)) {
      data.updatedCss = theme.css;
      update = await PublicThemes.updateOne({_id: publicTheme._id}, data, {upsert: true,});
    } else {
      data.css = theme.css;
      update = await PublicThemes.updateOne({_id: publicTheme._id}, data);
    }
  } catch(e) {
    res.status(403).json({message: 'Something went wrong.'})
  }

  res.json({
    id: publicTheme.id,
    description: data.description || publicTheme.description,
    screenshot: data.screenshot || publicTheme.screenshot,
    approved: publicTheme.approved,
    updatedCss: !!data.updatedCss
  })
};
