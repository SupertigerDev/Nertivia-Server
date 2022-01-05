import {ServerInvites} from '../../../models/ServerInvites'


module.exports = async (req, res, next) => {

  const doc = {
    server: req.server._id,
  }

  if (req.server.creator !== req.user._id) {
    doc.creator = req.user._id
  }

  const invites = await ServerInvites.find(doc, {_id: 0}).select("creator invite_code uses custom").populate("creator", "username avatar tag id");
  res.json(invites);
};
