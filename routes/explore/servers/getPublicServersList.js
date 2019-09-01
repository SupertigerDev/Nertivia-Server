// const FlakeId = require('flakeid');
// const flake = new FlakeId();
const publicServersList = require("./../../../models/publicServersList");

module.exports = async (req, res, next) => {
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
      $project: {
        id: 1,
        server: 1,
        server_id: 1,
        invite_code: 1,
        description: 1,
        verified: 1,
        _id: 0,
        server: { avatar: 1, name: 1, server_id: 1, public: 1  }
      }
    },
    { $sort: { "server.name": 1 } },
    // { $limit: 10 } //TODO: add lazy loading
  ]);

  res.json(serversList);
};
