const User = require("../../models/users");

module.exports = async (req, res, next) => {
  const setting = req.body;

  const settingName = Object.keys(setting)[0];
  const appearancePath = "settings.apperance." + settingName;
  const settingsValue = setting[settingName];

  User.findOneAndUpdate(
    { _id: req.user._id },
    { [appearancePath]: settingsValue }
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
    res.json({
      changed: { [settingName]: settingsValue }
    });
  });
};
