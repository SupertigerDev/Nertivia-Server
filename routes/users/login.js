const Users = require("../../models/users");
const JWT = require("jsonwebtoken");
const config = require("./../../config");

function signToken(uniqueID) {
  return JWT.sign(uniqueID, config.jwtSecret);
}

module.exports = async (req, res, next) => {
  const {email, password} = req.body;
  req.session.destroy();
  // Validate information

  // Find the user given the email
  const user = await Users.findOne({ email }).select(
    "avatar status admin _id username uniqueID tag created GDriveRefreshToken password"
  );

  // If not, handle it
  if (!user) {
    return res
      .status(404)
      .json({ errors: [{ msg: "Email is incorrect.", param: "email" }] });
  }

  // Check if the password is correct
  const isMatch = await user.isValidPassword(password);

  if (!isMatch) {
    return res
      .status(401)
      .json({
        status: false,
        errors: [{ msg: "Password is incorrect.", param: "password" }]
      });
  }

  user.password = undefined;

  // Generate token without header information
  const token = signToken(user.uniqueID)
    .split(".")
    .splice(1)
    .join(".");

  const data = {
    username: user.username,
    tag: user.tag,
    uniqueID: user.uniqueID,
    avatar: user.avatar
  };

  res.send({
    message: "You were logged in.",
    action: "logged_in",
    user: data,
    token
  });
};
