import {ServerInvites} from '../../../models/ServerInvites'


module.exports = async (req, res, next) => {
  const inviteCode = req.params.invite_code;

  // Find invite
  const invite = await ServerInvites.findOne({ invite_code: inviteCode })
    .populate("server", "+verified")
    .lean();

  if (!invite) {
    return res.status(404).json({ message: "Invalid invite." });
  }

  res.json(invite.server);
};
