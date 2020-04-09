const redis = require("./../../redis");
const Users = require ('./../../models/users');
const emitAll = require("../../socketController/emitToAll");

module.exports = async (req, res, next) => {
  const io = req.io;
  const { custom_status } = req.body;

  let customStatus = custom_status && custom_status.trim() !== "" ? custom_status : null;

  if (customStatus) {
    if (customStatus.length >= 100) {
      return res.status(401).json("String too long.")
    }
    customStatus = customStatus.replace(/\n/g, " ")
  }

  const obj = {};
  if (!customStatus) {
    obj.$unset = {
      custom_status: 1
    }
  } else {
    obj.$set =  {
      custom_status: customStatus
    }
  }
  await Users.updateOne({_id: req.user._id}, obj)

  // change the status in redis.
  await redis.changeCustomStatus(req.user.uniqueID, customStatus);

  // emit status to users.
  emitAll("member:custom_status_change", req.user._id, {uniqueID: req.user.uniqueID, custom_status: customStatus}, io)

  io.in(req.user.uniqueID).emit('multiDeviceCustomStatus', { custom_status: customStatus});
    

  res.json({
    custom_status: customStatus
  });
};
