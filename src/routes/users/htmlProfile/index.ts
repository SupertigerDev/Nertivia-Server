const htmlProfileRouter = require("express").Router();

// Middleware
const authenticate = require("../../../middlewares/authenticate");

import {addHtmlProfile} from './addHtmlProfile';
import {getHtmlProfile} from './getHtmlProfile';

htmlProfileRouter.route('/')
  .post(authenticate(true), addHtmlProfile);

htmlProfileRouter.route('/')
  .get(authenticate(), getHtmlProfile);



export {htmlProfileRouter};
