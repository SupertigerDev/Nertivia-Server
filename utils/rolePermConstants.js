module.exports = {
  ADMIN: 1,
  SEND_MESSAGES: 2,
  MANAGE_ROLES: 4,
  MANAGE_CHANNELS: 8,
  containsPerm (perms, flag) {
    return perms & (flag);
  }
};