const Friends = require("../models/friends");
const User = require("../models/users");
const Messages = require("../models/messages");
const Channels = require("../models/channels");

module.exports = {
  put: async (req, res, next) => {

    const data = req.body;


    User.findOneAndUpdate( { _id: req.user._id },{"about_me": data} ).exec(function(err, item) {
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
    });



    // name: "",
    // gender: null,
    // age: null,
    // continent: null,
    // country: null,
    // about_me: ""
  }
};
