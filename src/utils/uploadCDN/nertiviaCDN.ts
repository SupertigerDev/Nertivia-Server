import fetch from "node-fetch";
import FormData from "form-data";
export function uploadFile(
  BufferOrStream: any,
  userid: string,
  fileid: string,
  filename: string,
  isEmoji?: Boolean
) {
  return new Promise((resolve, reject) => {
    const form = new FormData();

    form.append("secret", process.env.FILE_CDN_SECRET);
    form.append("userid", userid || "");
    form.append("fileid", fileid || "");
    form.append("isemoji", isEmoji ? "1" : "0");
    form.append("fileToUpload", BufferOrStream, filename);

    fetch("https://media.nertivia.net/indexx.php", {
      method: "POST",
      body: form,
    }).then(async (res) => {
      if (res.status == 200) return resolve(true);
      const error = await res.text();
      reject(error);
    });
  });
}

export function deletePath(path: string) {
  return new Promise((resolve, reject) => {
    fetch("https://media.nertivia.net/indexx-remove.php", {
      method: 'DELETE',
      body: JSON.stringify({
        secret: process.env.FILE_CDN_SECRET,
        removePath: decodeURIComponent(path),
      }),
      headers: {'Content-Type': 'application/json'}
    }).then(async res => {
      if (res.status == 200) return resolve(true);
      const error = await res.text();
      reject(error);
    })
  });
}
