import themePolicy from '../../policies/ThemePolicies';


import { getTheme } from './getTheme';
import { deleteTheme } from './deleteTheme';
import { getThemes } from './getThemes';
import { saveTheme } from './saveTheme';
import { updateTheme } from './updateTheme';

// Middleware
import { authenticate } from "../../middlewares/authenticate";
import { Router } from 'express';


const ThemeRouter = Router();

// get theme
ThemeRouter.route("/:id").get(
  authenticate(),
  getTheme
);

// delete theme
ThemeRouter.route("/:id").delete(
  authenticate(),
  deleteTheme
);

// get themes
ThemeRouter.route("/").get(
  authenticate(),
  getThemes
);

// save theme
ThemeRouter.route("/").post(
  authenticate(),
  themePolicy.save,
  saveTheme
);

// update theme
ThemeRouter.route("/:id").patch(
  authenticate(),
  themePolicy.save,
  updateTheme
);




export {ThemeRouter};
