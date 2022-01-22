const htmlProfileRouter = require("express").Router();

// Middleware
const { authenticate } = require("../../../middlewares/authenticate");

import {addHtmlProfile} from './addHtmlProfile';
import {getHtmlProfile} from './getHtmlProfile';
import {deleteHtmlProfile} from './deleteHtmlProfile';

htmlProfileRouter.route('/')
  .post(authenticate(true), addHtmlProfile);

htmlProfileRouter.route('/')
  .get(authenticate(), getHtmlProfile);

htmlProfileRouter.route('/')
  .delete(authenticate(), deleteHtmlProfile);



export {htmlProfileRouter};
