const MainSettingsRouter = require("express").Router();
const busboy = require("connect-busboy");

// Middleware
const { authenticate } = require("../../middlewares/authenticate");
import { GoogleDriveOAuth } from "../../middlewares/GoogleDriveOAuth";
import {rateLimit} from '../../middlewares/rateLimit.middleware'

// Policies
const settingsPolicy = require("../../policies/settingsPolicies");
// Change Status
MainSettingsRouter.route("/status").post(
  authenticate({allowBot: true}),
  rateLimit({name: 'messages_load', expire: 60, requestsLimit: 50 }),
  settingsPolicy.status,
  require("./changeStatus")
);

// Change Custom Status
MainSettingsRouter.route("/custom-status").post(
  authenticate({allowBot: true}),
  rateLimit({name: 'messages_load', expire: 60, requestsLimit: 50 }),
  require("./changeCustomStatus")
);

// Change appearance
MainSettingsRouter.route("/apperance").put(
  //TODO: fix typo in database and client and server.
  authenticate(),
  require("./changeAppearance")
);

// Emoji
MainSettingsRouter.route("/emoji")
  .post(authenticate(), require("./addCustomEmoji"))
  .put(authenticate(), require("./renameCustomEmoji"))
  .delete(authenticate(), require("./deleteCustomEmoji"));

// Server Position
MainSettingsRouter.route("/server_position")
  .put(authenticate(), require("./serverPosition"))

// Link Google Drive
MainSettingsRouter.use(
  "/drive",
  GoogleDriveOAuth,
  require("./linkGoogleDrive")
);


module.exports = MainSettingsRouter;
