const botsRouter = require("express").Router();

// Middleware
const authenticate = require("../../middlewares/authenticate");
const UserPresentVerification = require("./../../middlewares/UserPresentVerification");
const checkRolePerms = require('./../../middlewares/checkRolePermissions');
const { ADMIN } = require("./../../utils/rolePermConstants");
const rateLimit = require('../../middlewares/rateLimit');

// routes
import createBot from './createBot';
import myBots from './myBots';
import getBot from './getBot';
import botJoin from './botJoin';

// create a bot
botsRouter.route("/").post(
  authenticate(),
  rateLimit({name: 'create_bot', expire: 60, requestsLimit: 2 }),
  createBot
);

// get bots created by user
botsRouter.route("/").get(
  authenticate(),
  myBots
);

// get bot. token only visable for creator. (SAFE TO USE FOR OTHER USERS.)
botsRouter.route("/:bot_id").get(
  authenticate(false, true),
  getBot
);

// join bot to a server
botsRouter.route("/:bot_id/servers/:server_id").put(
  authenticate(),
  rateLimit({name: 'bot_join', expire: 60, requestsLimit: 5 }),
  UserPresentVerification,
  checkRolePerms('Admin', ADMIN),
  botJoin
);


module.exports = botsRouter;
