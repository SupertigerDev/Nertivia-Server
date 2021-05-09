const Express = require("express");
const Themes = require('../../../models/themes');
const PublicThemes = require('../../../models/publicThemes');


/** @type {Express.RequestHandler} */
module.exports = async (req, res, next) => {
  const PublicThemeID = req.params.id;

  const publicTheme = await PublicThemes.updateOne({id: PublicThemeID}, {
    $pull: {
      likes: req.user._id
    }
  })


  res.json({message: "Unliked."})
};