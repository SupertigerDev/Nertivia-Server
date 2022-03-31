import {cropImage} from "../../utils/cropImage"
import { CustomEmojis } from '../../models/CustomEmojis';
const flake = require('../../utils/genFlakeId').default;
import * as NertiviaCDN from '../../common/NertiviaCDN'
import { CUSTOM_EMOJI_UPLOADED } from "../../ServerEventNames";
import { base64MimeType, isImageMime } from "../../utils/image";
import { Router, Request, Response } from "express";
import { authenticate } from "../../middlewares/authenticate";


export async function customEmojiAdd(Router: Router) {
  Router.route("/emoji")
  .post(authenticate(), route)
}

async function route(req: Request, res: Response) {
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
  //replace convert space to underscore
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


  const buffer = Buffer.from(req.body.avatar.split(",")[1], "base64");

  // 3048576 = 3mb
  const maxSize = 3048576;
  if (buffer.byteLength > maxSize) {
    return res.status(403).json({
      message: "Image is larger than 3MB."
    });
  }
  const mimeType = base64MimeType(req.body.avatar);
  const type = mimeType?.split("/")[1];

  if (!mimeType || !isImageMime(mimeType)) {
    return res.status(403).json({
      message: "Invalid image."
    });
  }

  const croppedImageBuffer = await cropImage(buffer, mimeType, 100);

  if (!croppedImageBuffer) {
    return res.status(403).json({
      message: "Something went wrong while cropping image."
    });
  }
  const emojiId = flake.gen();

  const uploadError = await NertiviaCDN.uploadEmoji({
    file: croppedImageBuffer,
    fileName: `${emojiId}.${type === 'gif' ? 'gif' : 'png'}`,
  })

  if (uploadError){
    return res.status(403).json({
      message: uploadError
    });
  };

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

function replaceAccents(str: string) {
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

