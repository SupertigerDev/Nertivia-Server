const fetch = require('node-fetch')
module.exports = (req, res, next) => {


  // decide if the captcha is required
  if (process.env.DEV_MODE === "true") {
    next();
    return;
  }
  
  if (!req.rateLimited) {
    next();
    return;
  } 


  const { token } = req.body;
  if (
    token === undefined ||
    token === null ||
    token === ''
  ) {
    return res.status(403).json({ status: false, errors: [{ msg: "Captcha is required", param: "reCaptcha", code: 1 }] });
  }

  const verifyUrl = "https://hcaptcha.com/siteverify"
  const secret = process.env.CAPTCHA_KEY;
  const siteKey = process.env.CAPTCHA_SITE_KEY;


  fetch(`${verifyUrl}?secret=${secret}&response=${token}&sitekey=${siteKey}&remoteip=${req.userIP}`, {
    method: "post",
  })
  .then(res => res.json())
  .then(json => {
    if (json.success === false) {
      throw Error("Invalid Token")
    }
    next();
  })
  .catch(() => {
    res.status(403).json({ status: false, errors: [{ msg: "Invalid Captcha ", param: "reCaptcha" }] });
  })



}
