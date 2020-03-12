// const FlakeId = require('flakeid');
// const flake = new FlakeId();
const publicServersList = require("./../../../models/publicServersList");

module.exports = async (req, res, next) => {
  const { verified, most_users, date_added } = req.query;

  const match = {};
  let sort = null;

  if (verified && verified == "false") {
    match.$or = [{ verified: false }, { verified: { $exists: false } }];
  } else if (verified && verified == "true") {
    match.verified = true;
  }

  if (most_users && most_users == "true") {
    sort = { total_members: -1 };
  } else if (most_users && most_users == "false") {
    sort = { total_members: 1 };
  } else if (date_added && date_added == "true") {
    sort = { created: -1 };
  }

  const serversList = await publicServersList.aggregate([
    {
      $lookup: {
        from: "servers",
        localField: "server",
        foreignField: "_id",
        as: "server"
      }
    },
    { $unwind: "$server" },
    {
      $lookup: {
        from: "users",
        localField: "creator",
        foreignField: "_id",
        as: "creator"
      }
    },
    { $unwind: "$creator" },

    {
      $lookup: {
        from: "server_members",
        localField: "server._id",
        foreignField: "server",
        as: "serverMembers"
      }
    },
    {
      $project: {
        id: 1,
        server: 1,
        server_id: 1,
        invite_code: 1,
        description: 1,
        verified: 1,
        creator: {username: 1, uniqueID: 1, tag: 1},
        created: 1,
        server: { avatar: 1, banner: 1, name: 1, server_id: 1, public: 1 },
        total_members: { $size: "$serverMembers" },
        _id: 0
      }
    },
    { $match: match },
    { $sort: sort || { "server.name": 1 } }
    // { $limit: 10 } //TODO: add lazy loading
  ]);

  res.json(serversList);
};
