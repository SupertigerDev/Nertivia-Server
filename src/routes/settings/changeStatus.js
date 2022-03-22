

import { Users } from "../../models/Users";
import emitUserStatus from '../../socketController/emitUserStatus'
import * as UserCache from '../../cache/User.cache';

module.exports = async (req, res, next) => {
  const { status } = req.body;
  const beforeStatus = req.user.status;


  await Users.updateOne({ _id: req.user._id },
    { $set: { "status": status } })
  // change the status in redis.
  await UserCache.updatePresence(req.user.id, {status})


  // emit status to users.
  if (beforeStatus === 0) {
    const presence = await UserCache.getPresenceByUserId(req.user.id);
    emitUserStatus({
      userId: req.user.id,
      userObjectId: req.user._id,
      emitOffline: false,
      status,
      customStatus: presence.custom,
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
