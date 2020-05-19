const Express = require("express");
const uploadImage = require('../../../utils/uploadBase64Image');
const Themes = require('../../../models/themes');
const PublicThemes = require('../../../models/publicThemes');

const flake = require('../../../utils/genFlakeId').default;


/** @type {Express.RequestHandler} */
module.exports = async (req, res, next) => {
  const oauth2Client = req.oauth2Client;
  const themeID = req.params.id;
  const { description, screenshot } = req.body;

  // check if theme exists
  const theme = await Themes.findOne({id: themeID, creator: req.user._id});
  if (!theme) {
    return res.status(404).json({message: 'id is invalid.'});
  }
  // check if public theme exists.
  const publicTheme = await PublicThemes.findOne({theme: theme._id});
  if (publicTheme) {
    return res.status(403).json({message: 'Theme is already public.'});
  }
  if (!oauth2Client) {
    return res.status(403).json({message: 'You must link your Google Drive to continue.'});
  }
  
  // 2092000 = 2mb
  const maxSize = 2092000;
  const {ok, error, result, message} = await uploadImage(screenshot, oauth2Client, maxSize, 'theme-screenshot-' + themeID);
  if (!ok) {
    return res.status(403).json({message});
  }
  const fileID = result.data.id;
  const id = flake.gen();

  const create = await PublicThemes.create({
    id,
    css: theme.css,
    description,
    theme: theme._id,
    creator: req.user._id,
    screenshot: fileID,
  })



  res.json({
    id: create.id,
    description: create.description,
    screenshot: create.screenshot,
    approved: false,
  })
};

// id: {type: String, required: true},
// css: {type: String, required: true},
// updatedCss: {type: String, required: true}, // When the creator updates their css, it will be added here for me to approve them.
// description: {type: String},
// created: {type: Number, default: 0},
// approved: {type: Boolean, default: false},
// theme: { type: Schema.Types.ObjectId, ref: 'themes' },
// creator: { type: Schema.Types.ObjectId, ref: 'users' },