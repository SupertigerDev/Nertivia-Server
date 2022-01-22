const MainThemesRouter = require("express").Router();

// Middleware
const { authenticate } = require("../../../middlewares/authenticate");
const policies = require('../../../policies/publicThemePolicies');
const rateLimit = require('../../../middlewares/rateLimit');


// add theme
MainThemesRouter.route('/:id').post(
  authenticate(),
  policies.submit,
  require("./addTheme")
);

// update theme
MainThemesRouter.route('/:id').patch(
  authenticate(),
  policies.update,
  require("./updateTheme")
);


// apply a theme
MainThemesRouter.route('/:id/apply').get(
  authenticate(),
  rateLimit({name: 'public_theme_apply', expire: 60, requestsLimit: 120 }),
  require("./applyPublicTheme")
);

// like a theme
MainThemesRouter.route('/:id/like').post(
  authenticate(),
  rateLimit({name: 'public_theme_like', expire: 60, requestsLimit: 120 }),
  require("./AddLike")
);
// unlike a theme
MainThemesRouter.route('/:id/like').delete(
  authenticate(),
  rateLimit({name: 'public_theme_like', expire: 60, requestsLimit: 120 }),
  require("./removeLike")
);


// get a theme
MainThemesRouter.route('/:id').get(
  authenticate(),
  require("./getPublicTheme")
);

// get all themes
MainThemesRouter.route('/').get(
  authenticate(),
  require("./getAllThemes")
);





module.exports = MainThemesRouter;
