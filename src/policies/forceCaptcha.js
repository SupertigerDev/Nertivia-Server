const fetch = require('node-fetch')

module.exports = (req, res, next) => {
  if (process.env.DEV_MODE === "true") {
    next();
    return;
  }
  req.rateLimited = true;
  next();
}
