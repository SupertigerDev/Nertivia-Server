

  const Users = require("../../models/users");
  const redis = require("./../../redis");
  const emitStatus = require("../../socketController/emitUserStatus");
  
  module.exports = async (req, res, next) => {
    const io = req.io;
    const { status } = req.body;
    const beforeStatus = req.user.status;
  
  
    await Users.updateOne({ _id: req.user._id },
      { $set: { "status": status } })
    // change the status in redis.
    await redis.changeStatus(req.user.uniqueID, status);

    // emit status to users.
    if (beforeStatus === 0) {
      const customStatus = await redis.getCustomStatus(req.user.uniqueID)
      emitStatus(req.user.uniqueID, req.user._id, status, io, false, customStatus?.result?.[1], true)
  
    } else {
      emitStatus(req.user.uniqueID, req.user._id, status, io);
    }
    res.json({
      status: true,
      set: status
    });
  };
  