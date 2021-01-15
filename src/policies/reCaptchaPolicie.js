const fetch = require('node-fetch')
import config from '../config';
module.exports = (req, res, next) => {


  // decide if the captcha is required
  if (config.devMode) {
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
  const secret = config.captchaKey;


  fetch(`${verifyUrl}?secret=${secret}&response=${token}`, {
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
