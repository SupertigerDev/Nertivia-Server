const Users = require('./../../models/users');


module.exports = async (req, res, next) => {
  let uniqueID = req.params.uniqueID;

  if (!uniqueID) {
    uniqueID = req.user.uniqueID
  }
  console.log("test")

  const user = await Users.findOne({
    uniqueID
  })
    .select("-status -__v -_id -friends +about_me +badges")
    .lean();
  if (!user)
    return res.status(404).json({
      message: "That user was not found."
    });
  res.json({
    user
  });
};
