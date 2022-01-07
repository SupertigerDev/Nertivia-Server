import { Users } from "../../models/Users";

module.exports = async (req, res, next) => {
  Users.findOneAndUpdate({ _id: req.user._id }, { $unset: {show_welcome: 1} }).exec(
    function(err, item) {
      if (err) {
        return res.status(403).json({
          message: "Could not be updated."
        });
      }
      if (!item) {
        return res.status(404).json({
          message: "Users not found"
        });
      }

      res.json({
        message: "Saved!"
      });
    }
  );
};
