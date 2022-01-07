import gm from 'gm';
import sharp from 'sharp';

const im = gm.subClass({imageMagick: true});



export async function cropImage (buffer: Buffer, mimeType: string, size: number): Promise<Buffer | undefined> {
  if (mimeType === "image/gif") {
    return new Promise(resolve => {
      im(buffer)
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
  }
  return sharp(buffer)
    .resize(size, size)
    .toBuffer();
  
};
