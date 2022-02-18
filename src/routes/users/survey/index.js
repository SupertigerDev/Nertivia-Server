const MainSurveyRouter = require("express").Router();

// Middleware
const { authenticate } = require("../../../middlewares/authenticate");

// Policies
const surveyPolicy = require("../../../policies/surveyPolicies");


// Details
MainSurveyRouter.route('/')
  .get(authenticate({allowBot: true}), require('./surveyDetails'));

// Update
MainSurveyRouter.route('/')
  .put(authenticate({allowBot: true}), surveyPolicy.put, require('./surveyUpdate'));





module.exports = MainSurveyRouter;
