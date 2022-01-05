const Express = require("express");
import {PublicThemes} from '../../../models/PublicThemes'


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