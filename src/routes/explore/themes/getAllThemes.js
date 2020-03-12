const Express = require("express");
const Themes = require("../../../models/themes");
const PublicThemes = require("../../../models/publicThemes");

/** @type {Express.RequestHandler} */
module.exports = async (req, res, next) => {
  const themes = await PublicThemes.find({ approved: true }, { _id: 0 })
    .select("id description screenshot theme stars creator")
    .populate([
      { path: "theme", select: "-_id name id"},
      {path: "creator", select: "-_id username tag uniqueID"}
    ])

  res.json(themes);
};
