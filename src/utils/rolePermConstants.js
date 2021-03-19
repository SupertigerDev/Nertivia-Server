module.exports = {
  roles: {
    ADMIN: 1,
    SEND_MESSAGES: 2,
    MANAGE_ROLES: 4,
    MANAGE_CHANNELS: 8,
    KICK_USER: 16,
    BAN_USER: 32,
  },
  containsPerm (perms, flag) {
    return perms & (flag);
  },
  changedPermissions(perms1, perms2) {
    const changed = {};
    for (let name in this.roles) {
      const perm = this.roles[name];
      const contains1 = !!this.containsPerm(perms1, perm);
      const contains2 = !!this.containsPerm(perms2, perm);
      if (contains1 !== contains2) {
        changed[name] = perm;
      }
    }
    return changed;
  }
};