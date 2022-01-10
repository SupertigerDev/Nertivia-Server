import {cropImage} from "../../utils/cropImage"
import { CustomEmojis } from '../../models/CustomEmojis';
const flake = require('../../utils/genFlakeId').default;
import * as nertiviaCDN from '../../utils/uploadCDN/nertiviaCDN'
import { CUSTOM_EMOJI_UPLOADED } from "../../ServerEventNames";

module.exports = async (req, res, next) => {

  if (!req.body.avatar) {
    return res.status(403).json({
      message: "Image is not present."
    });
  }
  const emojiCount = await CustomEmojis.countDocuments({
    user: req.user._id
  });

  if (emojiCount > 50) {
    return res.status(403).json({
      status: false,
      message: "Maximum amount of emojis has reached! (50 emojis)"
    });
  }


  //replaceAccents = remove special characters.
  //replace convert space to underscope
  let emojiName = replaceAccents(req.body.name).trim();

  if (emojiName.length < 1)
    return res.status(403).json({
      message: "Minimum: 1 characters are required."
    });

  if (emojiName.length > 30)
    return res.status(403).json({
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


  let buffer = Buffer.from(req.body.avatar.split(",")[1], "base64");

  // 3048576 = 3mb
  const maxSize = 3048576;
  if (buffer.byteLength > maxSize) {
    return res.status(403).json({
      message: "Image is larger than 3MB."
    });
  }
  const mimeType = base64MimeType(req.body.avatar);
  const type = mimeType.split("/")[1];

  if (!checkMimeType(mimeType)) {
    return res.status(403).json({
      message: "Invalid image."
    });
  }

  buffer = await cropImage(buffer, mimeType, 100);

  if (!buffer) {
    return res.status(403).json({
      message: "Something went wrong while cropping image."
    });
  }
  const emojiId = flake.gen();


  const success = await nertiviaCDN.uploadFile(buffer, null, null, `${emojiId}.${type === 'gif' ? 'gif' : 'png'}`, true).catch(err => {
    res.status(403).json({
      message: err
    });
  })
  if (!success) return;

  const addEmoji = await CustomEmojis.create({
    gif: type === "gif",
    user: req.user._id,
    id: emojiId,
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

  const io = req.io;
  // send owns status to every connected device
  io.in(req.user.id).emit(CUSTOM_EMOJI_UPLOADED, {
    emoji: addEmoji
  });
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

function base64MimeType(encoded) {
  var result = null;

  if (typeof encoded !== "string") {
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
