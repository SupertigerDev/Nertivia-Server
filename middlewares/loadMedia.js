const request = require("request");
const config = require("./../config");
const path = require('path');
const sharp = require('sharp')
const {google} = require('googleapis');

module.exports = async (req, res, next) => {
  const id = req.params["0"].split("/")[0];
  const type = req.query.type;


  google.drive("v3").files.get({
    fileId: id,
    key: config.googleDrive.key,
    alt: 'media',
  }, {
    responseType: 'arraybuffer'
  }, (err, resp) => {
    if (err) return res.status(404).end();
    let contentType = resp.headers["content-type"];
    if (!contentType.startsWith("image/")) {
      res.status(404).end();
      return;
    }
    res.set("Cache-Control", "public, max-age=31536000");
    var buffer = new Buffer.from(resp.data, 'base64');
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
