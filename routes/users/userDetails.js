const Users = require("./../../models/users");
const BlockedUsers = require("./../../models/blockedUsers");

module.exports = async (req, res, next) => {
  let uniqueID = req.params.uniqueID;

  if (!uniqueID) {
    uniqueID = req.user.uniqueID;
  }

  const user = await Users.findOne({
    uniqueID
  })
    .select("-status -__v -friends +about_me +badges")
    .lean();

  if (!user) {
    return res.status(404).json({
      message: "User was not found."
    });
  }

  //check if user is blocked.
  const isBlocked = await BlockedUsers.exists({
    requester: req.user._id, // blocked by
    recipient: user._id // blocked user
  })

  res.json({
    user,
    isBlocked
  });
};
