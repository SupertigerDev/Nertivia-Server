const request = require("request");
const config = require("./../config");
const path = require("path");
const sharp = require("sharp");
const fs = require("fs");
module.exports = async (req, res, next) => {
  const id = req.params["0"].split("/")[0];

  const url = `https://drive.google.com/uc?export=view&id=${id}`;
  const type = req.query.type;

  const requestSettings = {
    url,
    method: "GET",
    encoding: null
  };
  request(requestSettings, async (err, resp, buffer) => {
    if (!resp || resp.statusCode !== 200) return next();
    if (err) return next();
    let contentType = resp.headers["content-type"];
    res.set("Cache-Control", "public, max-age=31536000");
    if (type && type === "png") {
      sharp(buffer)
        .png()
        .toBuffer()
        .then(data => {
          res.end(data);
        })
        .catch(err => {
          next();
        });
    } else {
      res.end(buffer);
    }
    // save image to cache
    if (contentType.startsWith("image/")) {
      fs.writeFile(
        `public/cache/${id}.${contentType.split("/")[1]}`,
        buffer,
        "binary",
        () => {}
      );
    }
  });
};
