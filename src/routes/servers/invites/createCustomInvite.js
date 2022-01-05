import {ServerInvites} from '../../../models/ServerInvites'

module.exports = async (req, res, next) => {

  if (req.server.creator !== req.user._id) {
    return res.status(403).send({
      message: "Only server creators can create custom links."
    })
  }

  if (!req.server.verified) {
    return res.status(403).send({
      message: "Only verified servers can create custom links."
    })
  }

  if (!req.body.customCode) {
    await ServerInvites.deleteOne({ server: req.server._id, custom: true });
    res.json({ message: "Deleted." });
    return;
  }

  const customCodeTrimmed = req.body.customCode.trim();

  if (customCodeTrimmed.length >= 20) {
    return res.status(403).send({
      message: "Custom invite must be less than 20 characters."
    })
  }

  const condition = { server: req.server._id, custom: true};
  
  const action = {
    $set: {
      server: req.server._id,
      creator: req.user._id,
      custom: true,
      invite_code: customCodeTrimmed,
    }
  }

  await ServerInvites.updateOne(condition, action, {upsert: true})

  res.json({ message: "Added Custom Link!"});
};
