const { google } = require('googleapis');
const GDriveApi = require('../../API/GDrive');
import fs from 'fs';

interface Args {
  file: File,
  oauth2Client: any
}
interface File {
  fileName: string
  mimeType: string
  dirPath: string
}


export default async function uploadFile (args: Args) {
   
  const drive = google.drive({
    version: "v3",
    auth: args.oauth2Client
  });

  const requestFolderID = await GDriveApi.findFolder(args.oauth2Client);
  const folderID = requestFolderID.result.id;

  //upload file
  const fileMetadata: any = {
    name: args.file.fileName,
    parents: [folderID]
  };
  const media = {
    mimeType: args.file.mimeType,
    body: fs.createReadStream(args.file.dirPath)
  };
  const body = {
    value: "default",
    type: "anyone",
    role: "reader"
  };
  return new Promise((resolve, reject) => {
    drive.files
      .create({
        resource: fileMetadata,
        media: media,
        fields: "id,webViewLink"
      })
      .then((result:any) => {
        drive.permissions
          .create({
            fileId: result.data.id,
            resource: body
          })
          .then(() => resolve(result))
          .catch((error:any) => reject(error));
      })
      .catch((error:any) => resolve(error));
  });
}