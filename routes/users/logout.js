module.exports = async (req, res, next) => {
  req.session.destroy();

  res.status(204).end();
};
