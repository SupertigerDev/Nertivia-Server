import { OAuth2Client } from 'google-auth-library';
import { drive_v3, google } from 'googleapis';
import fs from 'fs';
import { GaxiosResponse } from 'googleapis-common/node_modules/gaxios';
// creates a folder in google drive called "nertivia_uploads".
export function createFolder(oAuth2Client: OAuth2Client) {
  const drive = google.drive({
    version: "v3",
    auth: oAuth2Client
  });

  const fileMetadata = {
    name: "nertivia_uploads",
    mimeType: "application/vnd.google-apps.folder"
  };
  return drive.files.create({
    requestBody: fileMetadata,
    fields: "id"
  })
}

export async function findFolder(oAuth2Client: OAuth2Client, _drive?: drive_v3.Drive) {
  const drive = _drive || google.drive({
    version: "v3",
    auth: oAuth2Client
  });

  const result = await drive.files.list({
    fields: "nextPageToken, files(id, name)",
    q: "mimeType='application/vnd.google-apps.folder' and name='nertivia_uploads'",
    pageSize: 1,
    orderBy: "createdTime"
  }).catch(() => {})
  const folder = result?.data.files?.[0];
  if (!folder) return null;
  return folder;
}

interface UploadOptions {
  fileStream: ReadableStream | fs.ReadStream,
  fileName: string,
  mimeType: string
}

export async function uploadFile(oAuth2Client: OAuth2Client, opts: UploadOptions): Promise<[GaxiosResponse<drive_v3.Schema$File> | null, string | null]> {
  const drive = google.drive({
    version: "v3",
    auth: oAuth2Client
  });

  const folder = await findFolder(oAuth2Client, drive);
  if (!folder?.id) return [null, "Folder does not exist."];

  const requestBody = {
    name: opts.fileName,
    parents: [folder.id],
  };

  const media = {
    mimeType: opts.mimeType,
    body: opts.fileStream
  };

  const file = await drive.files.create({
    requestBody,
    media: media,
    fields: "id,webViewLink"
  }).catch((error) => {
    console.log(error)
  })
  if (!file?.data.id) return [null, "File did not upload."];
  await drive.permissions.create({
    fileId: file.data.id,
    requestBody: {
      type: "anyone",
      role: "reader"
    }
  }).catch((err) => {
    console.log(err);
  })
  return [file, null];
}