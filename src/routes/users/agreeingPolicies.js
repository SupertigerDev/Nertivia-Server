import { Users } from "../../models/Users";
import * as UserCache from '../../cache/User.cache';
module.exports = async (req, res, next) => {
  await UserCache.removeUser(req.user.id);
  await Users.updateOne({id: req.user.id}, {$set: {readTerms: true}});
  res.json({success: true})
  

}