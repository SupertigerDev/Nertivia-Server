const fetch = require('node-fetch')
module.exports = (req, res, next) => {


  // decide if the captcha is required
  if (process.env.DEV_MODE) {
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
