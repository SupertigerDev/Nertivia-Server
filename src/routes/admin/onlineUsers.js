import { Users } from "../../models/Users";
import * as UserCache from '../../cache/User.cache';

module.exports = async (req, res, next) => {
  const userIds = await UserCache.getConnectedUserIds();
  const users = await Users.find({id:{ $in: userIds}}).select('-_id avatar id username tag created status ip email bot').sort({_id: -1}).limit(30).lean()
  res.json(users);
};

