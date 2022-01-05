const GDriveApi = require("../API/GDrive");
const stream = require("stream");

module.exports = (base64, oauth2Client, maxSize, name) => {
  return new Promise(async resolve => {
    const buffer = Buffer.from(base64.split(",")[1], "base64");

    if (buffer.byteLength > maxSize) {
      return resolve({
        ok: false,
        message: "Image is larger than 2MB."
      });
    }
    const mimeType = base64MimeType(base64);
    if (!checkMimeType(mimeType)) {
      return resolve({ ok: false, message: "Invalid image." });
    }

    const readable = new stream.Readable();
    readable._read = () => {}; // _read is required but you can noop it
    readable.push(buffer);
    readable.push(null);

    // get nertivia_uploads folder id
    const requestFolderID = await GDriveApi.findFolder(oauth2Client);
    if (!requestFolderID.result)
      return resolve({
        ok: false,
        message:
          "Error occured. Try relinking Google Drive from settings. (Error: Google Drive folder missing.)"
      });
    const folderID = requestFolderID.result.id;

    const requestUploadFile = await GDriveApi.uploadFile(
      {
        fileName: name,
        mimeType,
        fileStream: readable
      },
      folderID,
      oauth2Client
    );
    if (!requestUploadFile.ok) {
      resolve({
        error: requestUploadFile.error,
        ok: false,
        message: "Something went wrong."
      });
    } else {
      resolve(requestUploadFile);
    }
  });
};


function base64MimeType(encoded) {
  var result = null;

  if (typeof encoded !== 'string') {
    return result;
  }

  var mime = encoded.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);

  if (mime && mime.length) {
    result = mime[1];
  }

  return result;
}

function checkMimeType(mimeType) {
  const filetypes = /jpeg|jpg|gif|png/;
  const mime = filetypes.test(mimeType);
  if (mime) {
    return true;
  }
  return false;
}