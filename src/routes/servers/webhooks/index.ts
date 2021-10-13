import { Router } from "express";

const webhooksRouter = Router();

// Middleware
import authenticate from "../../../middlewares/authenticate";

import UserPresentVerification from './../../../middlewares/UserPresentVerification'

import rateLimit from "../../../middlewares/rateLimit";


import {createWebhook} from './createWebhook'
import {getWebhook} from './getWebhooks'

// create webhook
webhooksRouter.route("/:server_id/webhooks").post(
  authenticate(),
  UserPresentVerification,
  // checkRolePerms('Roles', MANAGE_ROLES),
  rateLimit({name: 'create_webhook', expire: 600, requestsLimit: 10}),
  createWebhook
);
webhooksRouter.route("/:server_id/webhooks").get(
  authenticate(),
  UserPresentVerification,
  // checkRolePerms('Roles', MANAGE_ROLES),
  getWebhook
);


module.exports = webhooksRouter;
