const botsRouter = require("express").Router();

// Middleware
const { authenticate } = require("../../middlewares/authenticate");
const UserPresentVerification = require("../../middlewares/UserPresentVerification");
const checkRolePerms = require('../../middlewares/checkRolePermissions');
const { roles: {ADMIN} } = require("../../utils/rolePermConstants");
const rateLimit = require('../../middlewares/rateLimit');
const UserPolicies = require('../../policies/UserPolicies');

// routes
import createBot from './createBot';
import myBots from './myBots';
import getBot from './getBot';
import botJoin from './botJoin';
import updateBot from './updateBot';
import deleteBot from './deleteBot';
import getCommands from './getCommands';
import resetBotToken from './resetBotToken';

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

// get commands
botsRouter.route("/commands").get(
  authenticate(),
  getCommands
);


// update my bot.
botsRouter.route("/:bot_id").post(
  authenticate(),
  UserPolicies.updateBot,
  updateBot
);


// delete my bot
botsRouter.route("/:bot_id").delete(
  authenticate(),
  deleteBot
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

// reset token /bots/6665254446718521344/reset-token
botsRouter.route("/:bot_id/reset-token").post(
  authenticate(),
  rateLimit({name: 'reset_bot_token', expire: 60, requestsLimit: 5 }),
  resetBotToken
);


module.exports = botsRouter;
