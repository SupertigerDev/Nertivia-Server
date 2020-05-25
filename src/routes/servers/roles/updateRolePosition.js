
const Roles = require("./../../../models/Roles");
module.exports = async (req, res, next) => {

  const {roleID, order} = req.body

  const roles = await Roles.find({ server: req.server._id }).select("name id color permissions server_id deletable order default hideRole").lean();

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

  await Roles.bulkWrite(
    itemsToUpdate.map(item => ({
      updateOne: {
        filter: {_id: item._id},
        update: { $set: item }
      }
    }))
  )

  const io = req.io;
  io.in("server:" + req.server.server_id).emit("server:update_roles", {server_id: req.server._id, roles: ordered});

  res.json(ordered);
};