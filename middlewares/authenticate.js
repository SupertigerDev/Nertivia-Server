const Users = require("../models/users");
const config = require("../config");
const JWT = require("jsonwebtoken");

module.exports = async (req, res, next) => {
    // check if details exist in redis session
    if (req.session["user"]) {
      req.user = req.session["user"];
      return next();
    }
    const token = config.jwtHeader + req.headers.authorization;
    // will contain uniqueID
    let decryptedToken;

    try {
      decryptedToken = await JWT.verify(token, config.jwtSecret);
    } catch (e) {
      return res.status(401).send({
        message: "Invalid Token."
      });
    }

    const user = await Users.findOne({ uniqueID: decryptedToken }).select(
      "avatar status admin _id username uniqueID tag created GDriveRefreshToken"
    );
    // If user doesn't exists, handle it
    if (!user) {
      return res.status(401).send({
        message: "Invalid Token."
      });
    }
    req.user = user
    req.session["user"] = user;

    next();
};
