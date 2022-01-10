
import {ServerRoles} from '../../../models/ServerRoles'
import { SERVER_ROLES_UPDATED } from '../../../ServerEventNames';
module.exports = async (req, res, next) => {

  const {roleID, order} = req.body


  const isCreator = req.server.creator === req.user._id
  // less = higher priority
  // higher = less priority
  if (!isCreator) {
    if (order <= req.highestRolePosition) {
      return res
      .status(403)
      .json({ message: "Your Role priority is too low to perfom this action." });
    }
  }



  const roles = await ServerRoles.find({ server: req.server._id }).select("name id color permissions server_id deletable order default hideRole bot").lean();

  // order roles
  let ordered = roles.sort((a, b) => a.order - b.order);

  if (order > roles.length && order < 0) {
    return res.json(ordered);
  }

  // find index of role
  let index = roles.findIndex(r => r.id == roleID);

  if (index < 0) {
    return res.json(ordered);
  }

  ordered.splice(order, 0, ordered.splice(index, 1)[0]);


  const defaultRole = roles.find(r => r.default);
  ordered = ordered.filter(o => !o.default)

  let itemsToUpdate = [];
  ordered = ordered.map((v, i) => {
      itemsToUpdate.push({_id: v._id, order: i})
      return {...v, ...{order: i}}
  })
  defaultRole.order = ordered.length;
  ordered.push(defaultRole);

  await ServerRoles.bulkWrite(
    itemsToUpdate.map(item => ({
      updateOne: {
        filter: {_id: item._id},
        update: { $set: item }
      }
    }))
  )

  const io = req.io;
  io.in("server:" + req.server.server_id).emit(SERVER_ROLES_UPDATED, {server_id: req.server.server_id, roles: ordered});

  res.json(ordered);
};