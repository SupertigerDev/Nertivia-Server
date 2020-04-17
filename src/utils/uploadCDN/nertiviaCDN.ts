import request from 'request';
import path from 'path';
import fs from 'fs';
import config from '../../config';


export function uploadFile(BufferOrStream: any, userid: string, fileid: string, filename: string, isEmoji?: Boolean) {
  return new Promise((resolve, reject) => {

    const options: request.Options = {
      url: 'https://www.nertivia-media.tk/indexx.php',
      formData: {
        secret: config.fileCDNSecret,
        userid: userid || "",
        fileid: fileid || "",
        isemoji: isEmoji ? "1" : "0",
        fileToUpload:{
          value:  BufferOrStream,
          options: {
            filename: filename
          }
        }
      }
    }
    request.post(options, (err, response, body) => {
      if (err || response.statusCode !== 200) return reject(err || body);
      resolve(true);
    })
  })
}