import {ServerInvites} from '../../../models/ServerInvites'


module.exports = async (req, res, next) => {
  const inviteCode = req.params.invite_code;

  // Find invite
  const invite = await ServerInvites.findOne({ invite_code: inviteCode })
    .select("creator server")
    .populate("server", "creator")
    .lean();

  if (!invite) {
    return res.status(404).json({ message: "Invalid invite." });
  }

  const isInviteCreator = invite.creator.toString() === req.user._id;
  const isServerCreator = invite.server.creator.toString() === req.user._id;

  if (!isInviteCreator && !isServerCreator) {
    return res.status(403).json({ message: "You do not have permission to delete this invite." });
  }

  await ServerInvites.deleteOne({ _id: invite._id });

  res.json({ message: "Deleted!" });
};
