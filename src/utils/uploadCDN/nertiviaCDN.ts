import fetch from "node-fetch";
import FormData from "form-data";
export async function uploadFile(
  bufferOrStream: any,
  userId: string,
  fileId: string,
  filename: string,
  isEmoji?: Boolean
) {
  const form = new FormData();

  form.append("secret", process.env.FILE_CDN_SECRET);
  form.append("userid", userId || "");
  form.append("fileid", fileId || "");
  form.append("isemoji", isEmoji ? "1" : "0");
  form.append("fileToUpload", bufferOrStream, filename);

  const res = await fetch("https://media.nertivia.net/indexx.php", {
    method: "POST",
    body: form,
  })
  if (res.status == 200) return null;
  const error = await res.text();
  return error;

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
