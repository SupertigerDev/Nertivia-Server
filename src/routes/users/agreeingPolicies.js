import { Users } from "../../models/Users";

module.exports = async (req, res, next) => {
  req.session.destroy();
  await Users.updateOne({id: req.user.id}, {$set: {readTerms: true}});
  res.json({success: true})
  

}