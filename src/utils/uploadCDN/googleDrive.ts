import {google} from 'googleapis';
const GDriveApi = require('../../API/GDrive');
import fs from 'fs';

interface Args {
  fileName: string
  mimeType: string
  dirPath: string
  oAuth2Client: any
}


export default async function uploadFile (args: Args) {
   
  const drive = google.drive({
    version: "v3",
    auth: args.oAuth2Client
  });

  const requestFolderID = await GDriveApi.findFolder(args.oAuth2Client);
  const folderID = requestFolderID.result.id;

  //upload file
  const fileMetadata = {
    name: args.fileName,
    parents: [folderID],
  };
  const media = {
    mimeType: args.mimeType,
    body: fs.createReadStream(args.dirPath)
  };
  const body = {
    type: "anyone",
    role: "reader"
  };

  const file = await drive.files.create({
    media,
    fields: "id,webViewLink",
    requestBody: fileMetadata
  })
  if (!file.data.id) return null;
  await drive.permissions.create({
    fileId: file.data.id,
    requestBody: body
  })

  return file;
}