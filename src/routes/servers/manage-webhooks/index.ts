import { Router } from "express";

const webhooksRouter = Router();

// Middleware
import authenticate from "../../../middlewares/authenticate";
import UserPresentVerification from './../../../middlewares/UserPresentVerification'
import rateLimit from "../../../middlewares/rateLimit";
import WebhookPolicies from "../../../policies/WebhookPolicies"


import {createWebhook} from './createWebhook'
import {getWebhook} from './getWebhooks'
import {deleteWebhook} from './deleteWebhook'
import {updateWebhook} from './updateWebhook'
import {getWebhookToken} from './getWebhookToken'

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
// update webhook
webhooksRouter.route("/:server_id/webhooks/:webhook_id").patch(
  authenticate(),
  UserPresentVerification,
  WebhookPolicies.updateWebhook,
  checkRolePermissions('Webhooks', roles.MANAGE_WEBHOOKS),
  updateWebhook
);
// delete webhook
webhooksRouter.route("/:server_id/webhooks/:webhook_id").delete(
  authenticate(),
  UserPresentVerification,
  checkRolePermissions('Webhooks', roles.MANAGE_WEBHOOKS),
  deleteWebhook
);
// get webhooks
webhooksRouter.route("/:server_id/webhooks").get(
  authenticate(),
  UserPresentVerification,
  checkRolePermissions('Webhooks', roles.MANAGE_WEBHOOKS),
  getWebhook
);
// get webhook token
webhooksRouter.route("/:server_id/webhooks/:webhook_id/token").get(
  authenticate(),
  UserPresentVerification,
  checkRolePermissions('Webhooks', roles.MANAGE_WEBHOOKS),
  getWebhookToken
);


module.exports = webhooksRouter;
