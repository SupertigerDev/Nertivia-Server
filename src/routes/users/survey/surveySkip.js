const User = require("../../../models/users");

module.exports = async (req, res, next) => {
  User.findOneAndUpdate({ _id: req.user._id }, { survey_completed: true }).exec(
    function(err, item) {
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
      // send to other clients.
      req.io.in(req.user.id).emit("survey:completed");

      res.json({
        message: "Saved!"
      });
    }
  );
};
