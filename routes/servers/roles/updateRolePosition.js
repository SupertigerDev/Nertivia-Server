
const Roles = require("./../../../models/Roles");
module.exports = async (req, res, next) => {

  const {roleID, order} = req.body

  // check if this function is executed by the guild owner.
  if (!req.server.creator.equals(req.user._id)) {
    return res
      .status(403)
      .json({ message: "You do not have permission to create roles!" });
  }

  const roles = await Roles.find({ server: req.server._id }).select("name id color permissions server_id deletable order").lean();

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



  let itemsToUpdate = [];
  ordered = ordered.map((v, i) => {
    itemsToUpdate.push({_id: v._id, order: i})
    return {...v, ...{order: i}}
  })

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