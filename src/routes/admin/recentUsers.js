const Users = require("../../models/users");

module.exports = async (req, res, next) => {
  const users = await Users.find({}, {_id: 0}).select('avatar uniqueID username tag created').sort({_id: -1}).limit(30).lean()
  res.json(users)
  
};