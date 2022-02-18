import * as UserCache from '../../cache/User.cache';
module.exports = async (req, res, next) => {
  await UserCache.removeUser(req.user.id);

  res.status(204).end();
};
