const gm = require("gm").subClass({imageMagick: true});
const sharp = require('sharp');
module.exports = async (buffer, mimeType, size) => {
  if (mimeType === "image/gif") {
    return new Promise(resolve => {
      gm(buffer)
        .coalesce()
        .resize(size, size, "^")
        .gravity("Center")
        .crop(size, size)
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
      .resize(size, size)
      .toBuffer();
  }
};
