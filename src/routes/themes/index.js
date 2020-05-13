const MainThemeRouter = require("express").Router();
const themePolicy = require ('../../policies/ThemePolicies');

// Middleware
const authenticate = require("../../middlewares/authenticate");


// get single theme
MainThemeRouter.route("/:id").get(
  authenticate(),
  require("./getTheme")
);

// get single theme
MainThemeRouter.route("/:id").delete(
  authenticate(),
  require("./deleteTheme")
);

// get themes
MainThemeRouter.route("/").get(
  authenticate(),
  require("./getThemes")
);

// save theme
MainThemeRouter.route("/").post(
  authenticate(),
  themePolicy.save,
  require("./saveTheme")
);

// update theme
MainThemeRouter.route("/:id").patch(
  authenticate(),
  themePolicy.save,
  require("./updateTheme")
);




module.exports = MainThemeRouter;
