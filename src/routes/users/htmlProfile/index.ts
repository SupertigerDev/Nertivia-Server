const htmlProfileRouter = require("express").Router();

// Middleware
const { authenticate } = require("../../../middlewares/authenticate");

import {addHtmlProfile} from './htmlProfileUpdate';
import {getHtmlProfile} from './htmlProfileGet';
import {deleteHtmlProfile} from './htmlProfileDelete';

htmlProfileRouter.route('/')
  .post(authenticate({allowBot: true}), addHtmlProfile);

htmlProfileRouter.route('/')
  .get(authenticate(), getHtmlProfile);

htmlProfileRouter.route('/')
  .delete(authenticate(), deleteHtmlProfile);



export {htmlProfileRouter};
