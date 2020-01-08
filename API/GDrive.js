const { google } = require("googleapis");
const fs = require("fs");

module.exports = {
  createFolder: oauth2Client => {
    const drive = google.drive({
      version: "v3",
      auth: oauth2Client
    });

    var fileMetadata = {
      name: "nertivia_uploads",
      mimeType: "application/vnd.google-apps.folder"
    };
    return new Promise(resolve => {
      drive.files
        .create({
          resource: fileMetadata,
          fields: "id"
        })
        .then(result =>
          resolve({
            ok: true,
            result
          })
        )
        .catch(error =>
          resolve({
            ok: false,
            error
          })
        );
    });
  },
  findFolder: oauth2Client => {
    const drive = google.drive({
      version: "v3",
      auth: oauth2Client
    });

    return new Promise(resolve => {
      drive.files
        .list({
          fields: "nextPageToken, files(id, name)",
          q:
            "mimeType='application/vnd.google-apps.folder' and name='nertivia_uploads'",
          pageSize: 1,
          orderBy: "createdTime"
        })
        .then(result =>
          resolve({
            ok: true,
            result: result.data.files[0]
          })
        )
        .catch(error =>
          resolve({
            ok: false,
            error
          })
        );
    });
  },
  uploadFile: (file, folderId, oauth2Client) => {
    const {fileName, mimeType, fileStream} = file;
    const drive = google.drive({
      version: "v3",
      auth: oauth2Client
    });

    //upload file
    const fileMetadata = {
      name: fileName,
      parents: [folderId]
    };
    const media = {
      mimeType: mimeType,
      body: fileStream
    };
    const body = {
      value: "default",
      type: "anyone",
      role: "reader"
    };
    return new Promise(resolve => {
      drive.files
        .create({
          resource: fileMetadata,
          media: media,
          fields: "id,webViewLink"
        })
        .then(result => {
          drive.permissions
            .create({
              fileId: result.data.id,
              resource: body
            })
            .then(() => resolve({ ok: true, result }))
            .catch(error => resolve({ ok: false, error }));
        })
        .catch(error => resolve({ ok: false, error }));
    });
  }
};
