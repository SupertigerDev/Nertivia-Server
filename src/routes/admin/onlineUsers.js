import { Users } from "../../models/Users";
const { getConnectedUserIds } = require("../../newRedisWrapper");
const redis = require('../../redis');

module.exports = async (req, res, next) => {

  
  const [userIds, error] = await getConnectedUserIds();

  if (error || !userIds) {
    return res.status(403).json({message: 'Something went wrong. (Redis failed.)'})
  }
  const onlineIds = userIds.map(i => i.split(':')[1]);
  const users = await Users.find({id:{ $in: onlineIds}}, {_id: 0}).select('avatar id username tag created status ip email bot').sort({_id: -1}).limit(30).lean()
  res.json(users);
};

