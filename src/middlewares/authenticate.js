const Users = require("../models/users");
const BannedIPs = require("../models/BannedIPs");
import config from '../config';
const JWT = require("jsonwebtoken");

module.exports = function (allowBot = false, allowInvalid = false) {
  return async function (req, res, next) {

    const token = config.jwtHeader + req.headers.authorization;
    // will contain uniqueID
    let decryptedToken;
    let passwordVersion = 0;

    try {
      const decrypted = JWT.verify(token, config.jwtSecret);
      const split = decrypted.split("-");
      decryptedToken = split[0];
      passwordVersion = split[1] ? parseInt(split[1]) : 0;
    } catch (e) {
      if (allowInvalid) return next();
      req.session.destroy();
      return res.status(401).send({
        message: "Invalid Token."
      });
    }

    // check if details exist in redis session
    if (req.session["user"]) {
      req.user = req.session["user"];
      const iPBanned = await checkIPChangeAndIsBanned(req, res);
      if (iPBanned) {
        return;
      }
      const pswdVerNotEmpty = req.user.passwordVersion === undefined && passwordVersion !== 0;
      if (pswdVerNotEmpty || req.user.passwordVersion !== undefined && req.user.passwordVersion !== passwordVersion) {
        req.session.destroy();
        return res.status(401).send({
          message: "Token invalidated."
        });
      }


      if (req.user.uniqueID === decryptedToken) {
        if (req.user.bot && !allowBot) {
          res.status(403).json({message: "Bots are not allowed to access this."})
          return;
        }
        return next();
      }
    }




    const user = await Users.findOne({ uniqueID: decryptedToken })
      .select(
        "avatar status admin _id username uniqueID tag created GDriveRefreshToken email_confirm_code banned bot passwordVersion"
      )
      .lean();
    // If user doesn't exists, handle it
    if (!user) {
      if (allowInvalid) return next();
      req.session.destroy();
      return res.status(401).send({
        message: "Invalid Token."
      });
    }
    if (user.banned) {
      req.session.destroy();
      return res.status(401).send({
        message: "You are banned."
      });
    }
    if (user.email_confirm_code) {
      if (allowInvalid) return next();
      req.session.destroy();
      return res.status(401).send({
        message: "Email not confimed"
      });
    }
    const pswdVerNotEmpty = user.passwordVersion === undefined && passwordVersion !== 0;
    if (pswdVerNotEmpty || user.passwordVersion !== undefined && user.passwordVersion !== passwordVersion) {
      req.session.destroy();
      return res.status(401).send({
        message: "Token invalidated."
      });
    }

    req.user = JSON.parse(JSON.stringify(user));
    req.session["user"] = user;
    const iPBanned = await checkIPChangeAndIsBanned(req, res);
    if (iPBanned) {
      return;
    }
    if (user.bot && !allowBot) {
      res.status(403).json({message: "Bots are not allowed to access this."})
      return;
    }

    next();
  };
}

async function checkIPChangeAndIsBanned(req, res) {
  const storedIP = req.session["ip"];
  if (!storedIP || storedIP != req.userIP) {
    // check if ip banned
    const ipBanned = await BannedIPs.exists({ ip: req.userIP });
    if (ipBanned) {
      res.status(401).send({
        message: "IP is banned."
      });
      req.session.destroy();
      return true;
    }
    addIPToDB(req);
    req.session["ip"] = req.userIP;
    return false;
  }
  return false;
}

function addIPToDB(req) {
  Users.updateOne(
    { _id: req.session.user._id },
    { ip: req.userIP },
    (err, doc) => { }
  );

  // UsersIPs.updateOne(
  //   { ip: req.userIP },
  //   { $addToSet: { users: req.session.user._id } },
  //   { upsert: true, setDefaultsOnInsert: true },
  //   (err, doc) => {}
  // );
}
