module.exports = async (req, res, next) => {
  if (req.user.admin !== 3 && req.user.admin !== 4 ) {
    return res.status(401).json({message: 'Admin only! Go away.'})
  }
  next();
};