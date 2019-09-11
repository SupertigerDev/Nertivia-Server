const Users = require("../../models/users");
const Devices = require("../../models/Devices");
const request = require('request');
const FlakeId = require('flakeid');
const flake = new FlakeId();

module.exports = async (req, res, next) => {
  const { token } = req.body;
  if (!token.trim()) {
    return res.status(403).json({message: 'Token not provided.'});
  }
  try {
    await Devices.create({
      user: req.user._id,
      platform: 'android',
      token,
    })
    res.json({message: 'Done'});
  } catch(e) {
    return res.status(403).json({message: 'token already saved.'});
  }
};

// const options = {
//   hostname: '127.0.0.1',
//   port: app.get('port'),
//   path: '/users',
//   method: 'POST',
//   json: {"name":"John", "lastname":"Doe"}
// }
// request(options, function(error, response, body){
//     if(error) console.log(error);
//     else console.log(body);
// });