import request from 'request';

export function uploadFile(BufferOrStream: any, userid: string, fileid: string, filename: string, isEmoji?: Boolean) {
  return new Promise((resolve, reject) => {

    const options: request.Options = {
      url: 'https://media.nertivia.net/indexx.php',
      formData: {
        secret: process.env.FILE_CDN_SECRET,
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

export function deletePath(path: string) {
  return new Promise((resolve, reject) => {
    const options: request.Options = {
      url: 'https://media.nertivia.net/indexx-remove.php',
      json: {
        secret: process.env.FILE_CDN_SECRET,
        removePath: path
      }
    }
    request.delete(options, (err, response, body) => {
      if (err || response.statusCode !== 200) return reject(err || body);
      resolve(body);
    })
  })
}