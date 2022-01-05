import {ServerInvites} from '../../../models/ServerInvites'

module.exports = async (req, res, next) => {
  //check if invite limit reached.
  const invites = await ServerInvites.find({
    server: req.server._id,
    creator: req.user._id
  });
  if (invites.length >= 30) {
    return res.status(403).json({
      message: "You have reached the maximum limit of invites for this server."
    });
  }

  const inviteCode = generateString(6);

  const create = await ServerInvites.create({
    server: req.server._id,
    creator: req.user._id,
    invite_code: inviteCode
  });

  res.json({ invite_code: inviteCode });
};


function generateString(n) {
  var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
  var string_length = n;
  var randomstring = "";
  for (var i = 0; i < string_length; i++) {
    var rnum = Math.floor(Math.random() * chars.length);
    randomstring += chars.substring(rnum, rnum + 1);
  }
  return randomstring;
}