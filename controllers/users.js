const Users = require('../models/users');

module.exports = {
  details: async (req, res, next) => {
    const uniqueID = req.params.uniqueID;

    if (!uniqueID) {
      return res.json({
        user: req.user
      });
    }

    const user = await Users.findOne({
      uniqueID
    }).select('-status -__v -_id -friends').lean();
    if (!user) return res.status(404).json({
      message: "That user was not found."
    });
    res.json({
      user
    });

  }
}