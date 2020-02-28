const Users = require("../../models/users");

module.exports = async (req, res, next) => {
  const value = req.params.value;
  const users = await Users.find({
    $or: [
      {username: { '$regex' : value, '$options' : 'i' }},
      {tag: value},
      {uniqueID: value},
    ]
  }, {_id: 0}).select('avatar uniqueID username tag created').sort({_id: -1}).limit(30).lean()
  res.json(users)
  
};