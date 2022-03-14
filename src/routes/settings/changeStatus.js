

  import { Users } from "../../models/Users";
  const redis = require("../../redis");
  import emitUserStatus from '../../socketController/emitUserStatus'
const { getCustomStatusByUserId, changeStatusByUserId } = require("../../newRedisWrapper");
  
  module.exports = async (req, res, next) => {
    const io = req.io;
    const { status } = req.body;
    const beforeStatus = req.user.status;
  
  
    await Users.updateOne({ _id: req.user._id },
      { $set: { "status": status } })
    // change the status in redis.
    await changeStatusByUserId(req.user.id, status);


    // emit status to users.
    if (beforeStatus === 0) {
      const [customStatus] = await getCustomStatusByUserId(req.user.id)
      emitUserStatus({
        userId: req.user.id,
        userObjectId: req.user._id,
        emitOffline: false,
        status,
        customStatus: customStatus?.[1],
        connected: true,
      })
  
    } else {
      emitUserStatus({
        userId: req.user.id,
        userObjectId: req.user._id,
        status,
      })
    }
    res.json({
      status: true,
      set: status
    });
  };
  