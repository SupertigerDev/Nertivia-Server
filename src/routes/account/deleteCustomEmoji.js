import {CustomEmojis} from '../../models/CustomEmojis';
import { CUSTOM_EMOJI_DELETED } from '../../ServerEventNames';

module.exports = async (req, res, next) => {
  const { id } = req.body;
  const userID = req.user._id;

  CustomEmojis.findOneAndRemove({ user: userID, id }).exec(function(
    err,
    item
  ) {
    if (err) {
      return res.status(403).json({
        status: false,
        message: "Emoji couldn't be removed!"
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
      message: "Emoji deleted."
    });
    const io = req.io;
    // send owns status to every connected device
    io.in(req.user.id).emit(CUSTOM_EMOJI_DELETED, {
      emoji: item
    });
  });
};
