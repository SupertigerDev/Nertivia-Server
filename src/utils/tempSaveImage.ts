import flake from "./genFlakeId";
import path from 'path'
import fs from 'fs'

export default function tempSaveImage(filename: string, file: NodeJS.ReadableStream | Buffer): Promise<{fileid: string, dirPath: string}> {
  return new Promise((res) => {
    const fileid = flake.gen();
    let dirPath: any = path.join(__dirname, "../", "public", "temp", `${fileid}${path.extname(filename)}`);
  
    // temporarly store file in server.
    if (file instanceof Buffer) {
      fs.writeFile(dirPath, file, (err) => {
        if (!err) {
          res({fileid, dirPath})
        }
      })
      return;
    }

    const writeStream = fs.createWriteStream(dirPath);
    file.pipe(writeStream);
    writeStream.on("close", () => {
      res({fileid, dirPath})
      writeStream.removeAllListeners();
      writeStream.end();
    })
  })
}