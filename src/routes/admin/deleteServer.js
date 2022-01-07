import { Users } from "../../models/Users";
const bcrypt = require("bcryptjs");
const { default: deleteServer } = require("../../utils/deleteServer");

module.exports = async (req, res, next) => {
  const server_id = req.params.server_id;
  const adminPassword = req.body.password;

  if (!adminPassword) return res.status(403).json({ message: "Invalid password" });

  // check admin password
  const admin = await Users.findById(req.user._id).select("password");
  const verify = await bcrypt.compare(adminPassword, admin.password);
  if (!verify) return res.status(403).json({ message: "Invalid password" });


  deleteServer(req.io, server_id, null, (err, status) => {
    if (err) return res.status(403).json({message: err.message});
    if (!status) return res.status(403).json({message: "Something went wrong. Try again later."});
    res.json("Server Deleted!");
  })
};
