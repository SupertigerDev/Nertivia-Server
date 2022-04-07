const htmlProfileRouter = require("express").Router();

// Middleware
const { authenticate } = require("../../../middlewares/authenticate");

import {htmlProfileUpdate} from './htmlProfileUpdate';
import {htmlProfileGet} from './htmlProfileGet';
import {htmlProfileDelete} from './htmlProfileDelete';

htmlProfileRouter.route('/')
  .post(authenticate({allowBot: true}), htmlProfileUpdate);

htmlProfileRouter.route('/')
  .get(authenticate(), htmlProfileGet);

htmlProfileRouter.route('/')
  .delete(authenticate(), htmlProfileDelete);



export {htmlProfileRouter};
