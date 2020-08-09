import flake from "./genFlakeId";
import path from 'path'
import fs from 'fs'

export default function tempSaveImage(filename: string, file: NodeJS.ReadableStream): Promise<{fileid: string, dirPath: string}> {
  return new Promise((res) => {
    const fileid = flake.gen();
    let dirPath: any = path.join(__dirname, "../", "public", "temp", `${fileid}${path.extname(filename)}`);
  
    // temporarly store file in server.
    const writeStream = fs.createWriteStream(dirPath);
    file.pipe(writeStream);
    writeStream.on("close", () => {
      res({fileid, dirPath})
      writeStream.removeAllListeners();
      writeStream.end();
    })
  })
}