import path from 'path';
import fs from 'fs';

import gm from 'gm';
const gmInstance = gm.subClass({ imageMagick: true });

interface Options {

}
export default async function compressImage(filename: string, dirPath?: string, opts?: Options): Promise<string> {

  return await new Promise(async (res, rej) => {
    if (!dirPath) return rej(undefined);
    const currentExt = path.extname(dirPath);
    if (currentExt !== ".webp" && currentExt !== ".gif") { 
      const newDir = path.join(path.dirname(dirPath), path.basename(dirPath, currentExt) + ".webp")
      const success = await renameAsync(dirPath, newDir).catch(err => {rej(err)})
      if (!success) return;
      dirPath = newDir;
      filename = path.basename(filename, currentExt) + ".webp"
    }
    gmInstance(dirPath)
      .resize(1920, 1080, ">")
      .quality(90)
      .autoOrient()
      .write(dirPath, err => {
        if (err && dirPath) {
          deleteFile(dirPath);
          return rej(err);
        }
        if (!dirPath) return rej(undefined);
        res(dirPath);
      })

  })

}

function deleteFile(path: string) {
  fs.unlink(path, err => {
    if (err) console.error(err)
  });
}


function renameAsync(oldDir: string, newDir: string) {
  return new Promise((res, rej) => {
    fs.rename(oldDir, newDir, err => {
      if (err) return rej(err);
      res(true);
    })
  })
}