import { Users } from "../../models/Users";

module.exports = async (req, res, next) => {
  const value = req.params.value;
  const users = await Users.find({
    $or: [
      {username: { '$regex' : value, '$options' : 'i' }},
      {email: { '$regex' : value, '$options' : 'i' }},
      {ip: { '$regex' : value, '$options' : 'i' }},
      {tag: value},
      {id: value},
    ]
  }, {_id: 0}).select('avatar email id ip username tag created banned bot banner').sort({_id: -1}).limit(30).lean()
  res.json(users)
  
};