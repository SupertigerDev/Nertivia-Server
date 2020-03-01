const request = require("request");
import config from '../config';
const path = require('path');
const sharp = require('sharp')
module.exports = (req, res, next) => {
  const id = req.params["0"].split("/")[0];

  const url = `https://avruqwirqo.cloudimg.io/v7/https://drive.google.com/uc?export=view&id=${id}`;
  const type = req.query.type;

  
  const requestSettings = {
    url,
    method: "GET",
    encoding: null
  };
 request(requestSettings, (err, resp, buffer) => {
   if (resp && resp.statusCode !== 200) return res.status(404).end();
   if (err) return res.status(404).end();
   res.set('Cache-Control', 'public, max-age=31536000');
    if (type && type === "webp") { 
      res.type('image/webp')
      sharp(buffer)
        .webp()
        .toBuffer()
        .then(data => {
          res.end(data);
        })
        .catch(err => {
          return res.status(404).end();
        });
    } else {
      res.end(buffer);
    }
  })
};