const User = require('../../models/users');

module.exports = async (req, res, next) => {
  req.session.destroy();
  const uniqueID = req.user.uniqueID;
  await User.updateOne({uniqueID}, {$set: {readTerms: true}});
  res.json({success: true})
  

}