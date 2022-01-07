import { Users } from "../../models/Users";

module.exports = async (req, res, next) => {
  const user_id = req.params.user_id;

  const user = await Users.findOne({id: user_id}).select("ip");
  if (!user) {
    return res.status(403).json({ message: "User not found." });
  }
  if (!user.ip) {
    return res.json([]);
  }


  const users = await Users.find({ip: user.ip}, {_id: 0}).select('avatar email id ip username tag created banned bot banner').sort({_id: -1}).limit(30).lean()
  res.json(users)
  
};