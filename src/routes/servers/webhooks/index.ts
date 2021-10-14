import { Router } from "express";

const webhooksRouter = Router();

// Middleware
import authenticate from "../../../middlewares/authenticate";

import UserPresentVerification from './../../../middlewares/UserPresentVerification'

import rateLimit from "../../../middlewares/rateLimit";


import {createWebhook} from './createWebhook'
import {getWebhook} from './getWebhooks'
import checkRolePermissions from "../../../middlewares/checkRolePermissions";
import {roles} from '../../../utils/rolePermConstants'

// create webhook
webhooksRouter.route("/:server_id/webhooks").post(
  authenticate(),
  UserPresentVerification,
  rateLimit({name: 'create_webhook', expire: 600, requestsLimit: 10}),
  checkRolePermissions('Webhooks', roles.MANAGE_WEBHOOKS),
  createWebhook
);
webhooksRouter.route("/:server_id/webhooks").get(
  authenticate(),
  UserPresentVerification,
  checkRolePermissions('Webhooks', roles.MANAGE_WEBHOOKS),
  getWebhook
);


module.exports = webhooksRouter;
