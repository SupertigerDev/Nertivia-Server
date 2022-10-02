import path from 'path';
import fs from 'fs';
import flake from "./genFlakeId";
import { Log } from '../utils/Log';

interface TempFile {
  fileId: string;
  filePath: string;
}


export function deleteFile(path: string) {
  return new Promise(resolve => {
    fs.unlink(path, err => {
      if (err) {
        resolve(false);
        Log.error(err);
        return;
      }
      resolve(true);
    });
  })
}

export function renameAsync(oldDir: string, newDir: string) {
  return new Promise((res, rej) => {
    fs.rename(oldDir, newDir, err => {
      if (err) return rej(err);
      res(true);
    })
  })
}


export function saveTempFile(file: Buffer | NodeJS.ReadableStream, fileName: string): Promise<[TempFile | null, string | null]> {
  return new Promise(resolve => {

    const fileId = flake.gen();
    const fileExtension = path.extname(fileName);
    const newFileName = `${fileId}${fileExtension}`;
    
    const filePath: any = path.join(__dirname, "../", "public", "temp", newFileName);
    
    
    // if its a buffer file
    if (file instanceof Buffer) {
      fs.writeFile(filePath, file, err => {
        if (err) {
          Log.error(err);
          return resolve([null, "Something went wrong when uploading (utils/file.ts)"])
        }
        resolve([{fileId, filePath}, null])
      })
      return;
    }
    const writeStream = fs.createWriteStream(filePath);
    writeStream.on("error", err => {
      Log.error(err);
      resolve([null, "Something went wrong when uploading (utils/file.ts)"])
      writeStream.removeAllListeners();
      writeStream.end();
    })
    writeStream.on("close", () => {
      resolve([{fileId, filePath}, null])
      writeStream.removeAllListeners();
      writeStream.end();
    })
    file.pipe(writeStream);
  })
}