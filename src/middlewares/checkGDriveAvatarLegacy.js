const sharp = require("sharp");
const fs = require("fs");
const {google} = require('googleapis');

module.exports = async (req, res, next) => {
  const id = req.params["0"].split("/")[0];
  if (id === "default.png") return next();
  const url = `https://drive.google.com/uc?export=view&id=${id}`;
  const type = req.query.type;


  google.drive("v3").files.get({
    fileId: id,
    key: process.env.DRIVE_KEY,
    alt: 'media',
  }, {
    responseType: 'arraybuffer'
  }, (err, resp) => {
    if (err) return next()
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
          return next();
        });
    } else {
      res.end(buffer);
    }
    // save image to cache
      fs.writeFile(
        `public/cache/${id}.${contentType.split("/")[1]}`,
        buffer,
        "binary",
        () => {}
      );
  })
};
