const path = require("path");
const User = require("../../models/users");
const GDriveApi = require("./../../API/GDrive");

const CustomEmojis = require("../../models/customEmojis");


module.exports = async (req, res, next) => {
  const oauth2Client = req.oauth2Client;
  // 1048576 = 1mb
  const maxSize = 1048576;
  if (req.headers["content-length"] >= maxSize)
    return res.status(403).json({
      status: false,
      message: "Image is larger than 1MB."
    });

  if (!req.busboy)
    return res.status(403).json({
      status: false,
      message: "Image is not present."
    });

  const emojiCount = await CustomEmojis.countDocuments({
    user: req.user._id
  });

  if (emojiCount > 50)
    return res.status(403).json({
      status: false,
      message: "Maximum amount of emojis has reached! (50 emojis)"
    });

  req.pipe(req.busboy);
  req.busboy.on(
    "file",
    async (fieldName, fileStream, fileName, encoding, mimeType) => {
      //replaceAccents = remove special characters.
      //replace convert space to underscope
      let emojiName = replaceAccents(path.parse(fileName).name).trim();

      if (emojiName.length < 1)
        return res.status(403).json({
          status: false,
          message: "Minimum: 1 characters are required."
        });

      if (emojiName.length > 30)
        return res.status(403).json({
          status: false,
          message: "Maximum: 30 characters are required."
        });
      emojiName = emojiName.replace(/[^A-Z0-9]+/gi, "_").trim();

      const checkEmojiExists = await CustomEmojis.findOne({
        user: req.user._id,
        name: emojiName
      });
      if (checkEmojiExists)
        return res.status(403).json({
          status: false,
          message: "Emoji with that name already exists!"
        });

      if (!checkMimeType({ fileName, mimeType }))
        return res.status(403).json({
          status: false,
          message: "Invalid image."
        });

      // get nertivia_uploads folder id
      const requestFolderID = await GDriveApi.findFolder(oauth2Client);
      const folderID = requestFolderID.result.id;

      const requestUploadFile = await GDriveApi.uploadFile(
        {
          fileName,
          mimeType,
          fileStream
        },
        folderID,
        oauth2Client
      );

      const addEmoji = await CustomEmojis.create({
        user: req.user._id,
        emojiID: requestUploadFile.result.data.id,
        name: emojiName
      });
      if (!addEmoji)
        return res.status(403).json({
          status: false,
          message: "Something went wrong."
        });

      res.json({
        status: true
      });

      // emit new emoji
      emitEmoji();

      function checkMimeType(file) {
        const filetypes = /jpeg|jpg|gif|png/;
        const mimeType = filetypes.test(file.mimeType);
        const extname = filetypes.test(
          path.extname(file.fileName).toLowerCase()
        );
        if (mimeType && extname) {
          return true;
        }
        return false;
      }

      async function emitEmoji() {
        const io = req.io;
        // send owns status to every connected device
        io.in(req.user.uniqueID).emit("customEmoji:uploaded", {
          emoji: addEmoji
        });
      }
    }
  );
};

function replaceAccents(str) {
  // Verifies if the String has accents and replace them
  if (str.search(/[\xC0-\xFF]/g) > -1) {
    str = str
      .replace(/[\xC0-\xC5]/g, "A")
      .replace(/[\xC6]/g, "AE")
      .replace(/[\xC7]/g, "C")
      .replace(/[\xC8-\xCB]/g, "E")
      .replace(/[\xCC-\xCF]/g, "I")
      .replace(/[\xD0]/g, "D")
      .replace(/[\xD1]/g, "N")
      .replace(/[\xD2-\xD6\xD8]/g, "O")
      .replace(/[\xD9-\xDC]/g, "U")
      .replace(/[\xDD]/g, "Y")
      .replace(/[\xDE]/g, "P")
      .replace(/[\xE0-\xE5]/g, "a")
      .replace(/[\xE6]/g, "ae")
      .replace(/[\xE7]/g, "c")
      .replace(/[\xE8-\xEB]/g, "e")
      .replace(/[\xEC-\xEF]/g, "i")
      .replace(/[\xF1]/g, "n")
      .replace(/[\xF2-\xF6\xF8]/g, "o")
      .replace(/[\xF9-\xFC]/g, "u")
      .replace(/[\xFE]/g, "p")
      .replace(/[\xFD\xFF]/g, "y");
  }

  return str;
}
