const Users = require("../../models/users");

module.exports = async (req, res, next) => {
  const redis = require('../../redis');

  
  const {ok, result, error} = await redis.connectedUserIds();
  if (!ok) {
    return res.status(403).json({message: 'Something went wrong. (Redis failed.)'})
  }
  const onlineIds = result.map(i => i.split(':')[1]);
  const users = await Users.find({uniqueID:{ $in: onlineIds}}, {_id: 0}).select('avatar uniqueID username tag created status').sort({_id: -1}).limit(30).lean()
  res.json(users);
};

