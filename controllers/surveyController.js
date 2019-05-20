const Friends = require("../models/friends");
const User = require("../models/users");
const Messages = require("../models/messages");
const Channels = require("../models/channels");

module.exports = {
  get: async (req, res, next) => {
    const result = await User.findById(req.user._id, 'about_me').lean();

    if (!result.about_me) {
      return res.status(403).json({
        message: "about_me does not exist."
      });
    }

    delete result._id;
    delete result.about_me._id;
    res.json({
      result: result.about_me
    });

  },
  put: async (req, res, next) => {
    const data = req.body;
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
  },
  skip: async (req, res, next) => {
    User.findOneAndUpdate(
      { _id: req.user._id },
      { survey_completed: true }
    ).exec(function(err, item) {
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
      req.io.in(req.user.uniqueID).emit("survey:completed");
      
      res.json({
        message: "Saved!"
      });
    });
  }
};
