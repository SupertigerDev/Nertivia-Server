import request from 'request';
import path from 'path';
import fs from 'fs';
import config from '../../config';
const FlakeId = require('flakeid');

const flakeId = new FlakeId(); 

export function uploadFile(filePath: string, userid: string) {
  return new Promise((resolve, reject) => {
    const fileid:string = flakeId.gen();

    const options: request.Options = {
      url: 'https://www.nertivia-media.tk/indexx.php',
      formData: {
        secret: config.fileCDNSecret,
        userid,
        fileid: fileid,
        fileToUpload: fs.createReadStream(filePath),
      }
    }
    request.post(options, (err, response, body) => {
      if (err || response.statusCode !== 200) return reject(err || body);
      resolve(fileid);
    })
  })
}