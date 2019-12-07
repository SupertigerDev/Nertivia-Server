const MainThemesRouter = require("express").Router();

// Middleware
const GDriveOauthClient = require("./../../../middlewares/GDriveOauthClient");
const { passportJWT } = require("./../../../middlewares/passport");
const policies = require('../../../policies/publicThemePolicies');
const rateLimit = require('../../../middlewares/rateLimit');


// add theme
MainThemesRouter.route('/:id').post(
  passportJWT,
  policies.submit,
  GDriveOauthClient,
  require("./addThemePublic")
);

// update theme
MainThemesRouter.route('/:id').patch(
  passportJWT,
  policies.update,
  GDriveOauthClient,
  require("./saveThemePublic")
);


// apply a theme
MainThemesRouter.route('/:id/apply').get(
  passportJWT,
  rateLimit({name: 'public_theme_apply', expire: 60, requestsLimit: 120 }),
  require("./applyThemePublic")
);


// get a theme
MainThemesRouter.route('/:id').get(
  passportJWT,
  require("./getThemePublic")
);

// get all themes
MainThemesRouter.route('/').get(
  passportJWT,
  require("./getAllThemes")
);





module.exports = MainThemesRouter;
