const MainRelationshipRouter = require("express").Router();

// Middleware
const { authenticate } = require("../../../middlewares/authenticate");

// Policies
const relationshipPolicy = require("../../../policies/relationshipPolicies");


// Add
MainRelationshipRouter.route('/')
  .post(authenticate(), relationshipPolicy.post, require('./friendRequest').friendRequest);

// Accept
MainRelationshipRouter.route('/')
  .put(authenticate(), relationshipPolicy.put, require('./friendAccept').friendAccept);


// Remove
MainRelationshipRouter.route('/')
  .delete(authenticate(), relationshipPolicy.delete, require('./friendRemove').friendRemove);


module.exports = MainRelationshipRouter;
