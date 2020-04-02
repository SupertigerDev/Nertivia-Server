const FlakeId = require("flakeid");
const Roles = require("./../../../models/Roles");

const rolePerms = require("../../../utils/rolePermConstants");

const flake = new FlakeId({
  timeOffset: (2013 - 1970) * 11636000 * 1000
});

module.exports = async (req, res, next) => {

  // check if roles limit reached
  const rolesCount = await Roles.countDocuments({ server: req.server._id });

  if (rolesCount >= 30) {
    return res.status(403).json({ message: "Role limit reached! (>= 30)" });
  }

  const id = flake.gen();
  const doc = {
    name: "New Role",
    id: id,
    permissions: rolePerms.SEND_MESSAGES,
    server: req.server._id,
    server_id: req.server.server_id,
    order: rolesCount
  };
  const create = await Roles.create(doc);
  await Roles.updateOne({server: req.server._id, default: true}, {$inc: {order: 2}})

  const data = {
    name: doc.name,
    permissions: doc.permissions,
    deletable: true,
    id: id,
    server_id: doc.server_id,
    order: rolesCount
  };
  const io = req.io;
  io.in("server:" + req.server.server_id).emit("server:create_role", data);

  res.json(data);
};

