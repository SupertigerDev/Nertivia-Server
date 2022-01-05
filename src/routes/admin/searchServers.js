import {Servers} from "../../models/Servers";

module.exports = async (req, res, next) => {
  const value = req.params.value;
  const servers = await Servers.find({
    $or: [
      {name: { '$regex' : value, '$options' : 'i' }},
      {server_id: value},
    ]
  }, {_id: 0}).select('avatar server_id created name creator').populate("creator", "username id").sort({_id: -1}).limit(30).lean()
  res.json(servers)
  
};