import { Router } from "express";
const { authenticate } = require("../../middlewares/authenticate");


const TenorRouter = Router();

import GetCategories from './getCategories'
import getSearches from './getSearches'

// Get Categories
TenorRouter.route("/categories").get(
  authenticate(),
  GetCategories
);

// Get search
TenorRouter.route("/search/:value").get(
  authenticate(),
  getSearches
);





export {TenorRouter};