
const User = require("../../../models/users");
const { matchedData } = require('express-validator/filter');

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
      await User.updateOne({ _id: req.user._id }, { survey_completed: true });
      res.json({
        message: "Saved!"
      });
      // send to other clients.
      req.io.in(req.user.uniqueID).emit("survey:completed");
    }
  );
};
