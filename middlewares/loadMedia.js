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
   if (resp && resp.statusCode !== 200) return res.status(404).end();
   if (err) return res.status(404).end();
   res.set('Cache-Control', 'public, max-age=31536000');
    if (type && type === 'png') {
      res.type('image/png')
      sharp(buffer)
        .png()
        .toBuffer()
        .then( data => { 
          res.end(data);
        })
        .catch( err => { console.log(err); res.status(404).end();});
    } else {
      res.type(resp.headers['content-type'])
      const mime = resp.headers['content-type'].split("/");
      if (mime[0] !== "image") {
        res.set("Content-Disposition", "attachment;filename="+ id + "." + mime[1]);
      }
      res.end(buffer); 
    }
  })
};