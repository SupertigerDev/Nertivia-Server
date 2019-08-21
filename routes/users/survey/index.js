const MainSurveyRouter = require("express").Router();

// Middleware
const { passportJWT } = require("./../../../middlewares/passport");

// Policies
const surveyPolicy = require("./../../../policies/surveyPolicies");


// Details
MainSurveyRouter.route('/')
  .get(passportJWT, require('./surveyDetails'));

// Update
MainSurveyRouter.route('/')
  .put(passportJWT, surveyPolicy.put, require('./surveyUpdate'));


// Skip
MainSurveyRouter.route('/skip')
  .delete(passportJWT, require('./surveySkip'));


module.exports = MainSurveyRouter;
