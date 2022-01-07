import { Users } from "../../../models/Users";

module.exports = async (req, res, next) => {
  const result = await Users.findById(req.user._id, "about_me").lean();

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
};
