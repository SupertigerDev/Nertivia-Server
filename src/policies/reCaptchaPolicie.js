const request = require('request')
import config from '../config';
module.exports = (req, res, next) => {

  const {android} = req.query;
  const {token} = req.body;
  if (
    token === undefined ||
    token === null ||
    token === ''
  ) {
    return res.status(403).json({status: false, errors: [{msg: "ReCaptcha is not provided", param: "reCaptcha"}]});
  }


  const verifyUrl = `https://google.com/recaptcha/api/siteverify?secret=${android === "true" ? config.androidReCaptchaKey: config.reCaptchaKey}&response=${token}&remoteip=${req.connection.remoteAddress}`;
  
  // Make Request To VerifyURL
  request(verifyUrl, (err, response, body) => {
    body = JSON.parse(body);

    // If Not Successful
    if(body.success !== undefined && !body.success){
      return res.status(403).json({status: false, errors: [{msg: "Invalid ReCaptcha ", param: "reCaptcha"}]});
    }
    //If Successful
    next();
  });


}