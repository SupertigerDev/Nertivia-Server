const MainThemeRouter = require("express").Router();
const themePolicy = require ('../../policies/ThemePolicies');

// Middleware
const { passportJWT } = require("../../middlewares/passport");


// get single theme
MainThemeRouter.route("/:id").get(
  passportJWT,
  require("./getTheme")
);

// get single theme
MainThemeRouter.route("/:id").delete(
  passportJWT,
  require("./deleteTheme")
);

// get themes
MainThemeRouter.route("/").get(
  passportJWT,
  require("./getThemes")
);

// save theme
MainThemeRouter.route("/").post(
  passportJWT,
  themePolicy.save,
  require("./saveTheme")
);

// update theme
MainThemeRouter.route("/:id").patch(
  passportJWT,
  themePolicy.save,
  require("./updateTheme")
);




module.exports = MainThemeRouter;
