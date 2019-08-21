const MainSurveyRouter = require("express").Router();

// Middleware
const { passportJWT } = require("./../../../middlewares/passport");

// Policies
const surveyPolicy = require("./../../../policies/surveyPolicies");


// Details
MainSurveyRouter.route('/')
  .get(passportJWT, require('./details'));

// Update
MainSurveyRouter.route('/')
  .put(passportJWT, surveyPolicy.put, require('./update'));


// Skip
MainSurveyRouter.route('/skip')
  .delete(passportJWT, require('./skip'));


module.exports = MainSurveyRouter;
