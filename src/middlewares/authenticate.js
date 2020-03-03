const Users = require("../models/users");
const BannedIPs = require("../models/BannedIPs");
import config from '../config';
const JWT = require("jsonwebtoken");

module.exports = async (req, res, next) => {
  // check if details exist in redis session
  if (req.session["user"]) {
    req.user = req.session["user"];
    const iPBanned = await checkIPChangeAndIsBanned(req, res);
    if (iPBanned) {
      return;
    }
    return next();
  }
  const token = config.jwtHeader + req.headers.authorization;
  // will contain uniqueID
  let decryptedToken;

  try {
    decryptedToken = JWT.verify(token, config.jwtSecret);
  } catch (e) {
    req.session.destroy();
    return res.status(401).send({
      message: "Invalid Token."
    });
  }

  const user = await Users.findOne({ uniqueID: decryptedToken })
    .select(
      "avatar status admin _id username uniqueID tag created GDriveRefreshToken email_confirm_code banned"
    )
    .lean();
  // If user doesn't exists, handle it
  if (!user) {
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
    req.session.destroy();
    return res.status(401).send({
      message: "Email not confimed"
    });
  }
  req.user = JSON.parse(JSON.stringify(user));
  req.session["user"] = user;
  const iPBanned = await checkIPChangeAndIsBanned(req, res);
  if (iPBanned) {
    return;
  }

  next();
};

async function checkIPChangeAndIsBanned(req, res) {
  const storedIP = req.session["ip"];
  if (!storedIP || storedIP != req.userIP) {
    // check if ip banned
    const ipBanned = await BannedIPs.exists({ip: req.userIP});
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
    { _id: req.session.user._id},
    { ip: req.userIP},
    (err, doc) => {}
  );

  // UsersIPs.updateOne(
  //   { ip: req.userIP },
  //   { $addToSet: { users: req.session.user._id } },
  //   { upsert: true, setDefaultsOnInsert: true },
  //   (err, doc) => {}
  // );
}
