import fetch from "node-fetch";
import FormData from "form-data";
import flake from "../utils/genFlakeId";
import fs from 'fs';
interface UploadFileOptions {
  file: Buffer | ReadableStream | fs.ReadStream,
  userId: string,
  fileName: string,
}

export async function uploadFile(opts: UploadFileOptions) {
  const form = new FormData();
  const id = flake.gen();

  form.append("secret", process.env.FILE_CDN_SECRET);
  form.append("userid", opts.userId || "");
  form.append("fileid", id || "");
  form.append("isemoji", "0");
  form.append("fileToUpload", opts.file, opts.fileName);

  const result = await fetch("https://media.nertivia.net/indexx.php", {
    method: "POST",
    body: form,
  })

  if (result.status !== 200) {
    const error = await result.text();
    return [null, error];
  }
  const path = `${opts.userId}/${id}/${encodeURIComponent(opts.fileName)}`;
  return [path, null];
}

interface UploadEmojiOptions {
  file: Buffer | ReadableStream | fs.ReadStream,
  fileName: string,
}

export async function uploadEmoji(opts: UploadEmojiOptions) {
  const form = new FormData();

  form.append("secret", process.env.FILE_CDN_SECRET);
  form.append("userid", "");
  form.append("fileid", "");
  form.append("isemoji", "1");
  form.append("fileToUpload", opts.file, opts.fileName);

  const result = await fetch("https://media.nertivia.net/indexx.php", {
    method: "POST",
    body: form,
  })

  if (result.status !== 200) {
    const error = await result.text();
    return error;
  }
  return false;
}

export async function deleteFile(path: string) {
  const result = await fetch("https://media.nertivia.net/indexx-remove.php", {
    method: 'DELETE',
    body: JSON.stringify({
      secret: process.env.FILE_CDN_SECRET,
      removePath: decodeURIComponent(path),
    }),
    headers: {'Content-Type': 'application/json'}
  })

  if (result.status !== 200) {
    const error = await result.text();
    return error;
  }
  return false;
}