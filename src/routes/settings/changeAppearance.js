import { Users } from "../../models/Users";

module.exports = async (req, res, next) => {
  const setting = req.body;

  const settingName = Object.keys(setting)[0];
  const appearancePath = "settings.apperance." + settingName;
  const settingsValue = setting[settingName];

  Users.findOneAndUpdate(
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
        message: "Users not found"
      });
    }
    res.json({
      changed: { [settingName]: settingsValue }
    });
  });
};
