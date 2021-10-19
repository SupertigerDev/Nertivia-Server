
const User = require("../../../models/users");
const { matchedData } = require('express-validator');

module.exports = async (req, res, next) => {
  const data = matchedData(req);
  User.findOneAndUpdate({ _id: req.user._id }, { about_me: data }).exec(
    async function(err, item) {
      if (err) {
        return res.status(403).json({
          message: "Could not be updated."
        });
      }
      if (!item) {
        return res.status(404).json({
          message: "User not found"
        });
      }
      res.json({
        message: "Saved!"
      });

    }
  );
};
