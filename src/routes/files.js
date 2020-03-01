const request = require("request");
import config from '../config';
const path = require('path');
const sharp = require('sharp')
const {google} = require('googleapis');

module.exports = async (req, res, next) => {
  const id = req.params["0"].split("/")[0];
  const name = req.params["0"].split("/")[1];
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
    const mime = contentType.split("/")[1];
    res.set("Cache-Control", "public, max-age=31536000");
    var buffer = new Buffer.from(resp.data, 'base64');
    res.set("Content-Disposition", "attachment;filename="+ (name || id + "." + mime));

    res.end(buffer); 

  })
};
