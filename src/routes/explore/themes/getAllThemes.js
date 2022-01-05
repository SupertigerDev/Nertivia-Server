const Express = require("express");
import {PublicThemes} from '../../../models/PublicThemes'

import {ObjectId} from "mongodb"

/** @type {Express.RequestHandler} */
module.exports = async (req, res, next) => {
  const { version } = req.query;

  let filters = {};
  if (version) {
    filters.compatible_client_version = version;
  }

  // const themes = await PublicThemes.find({ approved: true, ...filters }, { _id: 0 })
  //   .select("id description screenshot theme creator compatible_client_version")
  //   .populate([
  //     { path: "theme", select: "-_id name id" },
  //     { path: "creator", select: "-_id username tag id" }
  //   ])




  const themes = await PublicThemes.aggregate([
    { $match: { approved: true, ...filters } },
    // populate
    { $lookup: { from: 'users', localField: 'creator', foreignField: '_id', as: 'creator' } },
    { $lookup: { from: 'themes', localField: 'theme', foreignField: '_id', as: 'theme' } },
    // change [populate] to populate
    {$unwind: {path: '$creator'}},
    {$unwind: {path: '$theme'}},
    {
      $project: {
        theme: {name: 1, id: 1},
        creator: {username: 1, tag: 1, id: 1},
        id: 1,
        description: 1,
        screenshot: 1,
        compatible_client_version: 1,
        likes: {
          $size: { $ifNull: ["$likes", []] }
        },
        liked: {
          $in:[new ObjectId(req.user._id), {$ifNull:["$likes", []]}]
        }
      }
    },
    { "$sort": { "likes": -1 } },
  ]);

  res.json(themes);
};
