module.exports = async (req, res, next) => {
  if (req.user.type !== "CREATOR" && req.user.type !== "ADMIN" ) {
    return res.status(401).json({message: 'Admin only! Go away.'})
  }
  next();
};