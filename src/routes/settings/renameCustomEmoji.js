import {CustomEmojis} from '../../models/CustomEmojis';
import { CUSTOM_EMOJI_RENAMED } from '../../ServerEventNames';

module.exports = async (req, res, next) => {
  const { id, name } = req.body;
  const userID = req.user._id;

  if (name.trim().length < 1)
    return res.status(403).json({
      status: false,
      message: "Minimum: 1 characters are required."
    });

  if (name.trim().length > 30)
    return res.status(403).json({
      status: false,
      message: "Maximum: 30 characters are required."
    });

  const emojiName = replaceAccents(name)
    .replace(/[^A-Z0-9]+/gi, "_")
    .trim()

  const checkEmojiExists = await CustomEmojis.findOne({
    user: req.user._id,
    name: emojiName,
    id: {$ne: id}
  });
  if (checkEmojiExists)
    return res.status(403).json({
      status: false,
      message: "Emoji with that name already exists!"
  });


  CustomEmojis.findOneAndUpdate(
    { user: userID, id },
    {
      $set: {
        name: emojiName
      }
    },
    { new: true }
  ).exec(function(err, item) {
    if (err) {
      return res.status(403).json({
        status: false,
        message: "Emoji couldn't be renamed!"
      });
    }
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Emoji was not found."
      });
    }
    res.json({
      success: true,
      message: "Emoji renamed."
    });
    const io = req.io;
    // send owns status to every connected device
    io.in(req.user.id).emit(CUSTOM_EMOJI_RENAMED, {
      emoji: item
    });
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
