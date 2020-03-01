const redis = require("./../../redis");

module.exports = async (req, res, next) => {
  const emitStatus = require("../../socketController/emitUserStatus");
  const io = req.io;
  const { status } = req.body;

  // change the status in redis.
  await redis.changeStatus(req.user.uniqueID, status);

  // emit status to users.
  emitStatus(req.user.uniqueID, req.user._id, status, io, true);

  res.json({
    status: true,
    set: status
  });
};
