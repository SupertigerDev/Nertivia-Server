const gm = require("gm").subClass({imageMagick: true});
const sharp = require('sharp');

module.exports = async (buffer, mimeType) => {
  if (mimeType === "image/gif") {
    return new Promise(resolve => {
      gm(buffer)
        .coalesce()
        .resize("200", "200", "^")
        .gravity("Center")
        .crop("200", "200")
        .repage("+")
        .dither(false)
        .matte()
        .fuzz(10)
        .colors(128)
        .toBuffer((err, buff) => {
          if (err) return resolve(undefined);
          resolve(buff);
        });
    });
  } else {
    return await sharp(buffer)
      .resize(200, 200)
      .webp()
      .toBuffer();
  }
};
