const request = require("request");
const config = require("./../config");
const path = require('path');
const sharp = require('sharp')
module.exports = (req, res, next) => {
  const id = req.params["0"];

  const url = `https://drive.google.com/uc?export=view&id=${id}`;
  const type = req.query.type;

  
  const requestSettings = {
    url,
    method: "GET",
    encoding: null
  };
 request(requestSettings, (err, resp, buffer) => {
    if (!resp || resp.statusCode !== 200) return next()
   if (err) return next()
   res.set('Cache-Control', 'public, max-age=31536000');
    if (type && type === 'png') {
      sharp(buffer)
        .png()
        .toBuffer()
        .then( data => { res.end(data); })
        .catch( err => {next()});
    } else {
      res.end(buffer); 
    }
  })
};