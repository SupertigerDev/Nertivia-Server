module.exports = async (req, res, next) => { 

  if (req.channel.isBlocked) {
    return res.status(403).json({
      message: "The user is either blocked by you, or them."
    });
  }
  next()
}
