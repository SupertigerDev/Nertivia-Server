module.exports = {
  ADMIN: 1,
  SEND_MESSAGES: 2,
  containsPerm (perms, flag) {
    return perms & flag;
  }
};