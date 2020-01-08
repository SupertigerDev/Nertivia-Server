const request = require("request");
const config = require("./../config");
const path = require('path');
const sharp = require('sharp')
const fs = require('fs');
module.exports = async (req, res, next) => {

  const id = req.params["0"];
  const type = req.query.type;

  // find file
  fs.readdir( "public/cache", (err, files) => {
    if (!files) return next();
    const filePath = files.find(f => {
      const name = path.parse(f).name;
      return name === id
    })
    if (!filePath) return next();
    fs.readFile(`public/cache/${filePath}`, (err, buffer) => {
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
  });


};