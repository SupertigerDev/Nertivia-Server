const MainRelationshipRouter = require("express").Router();

// Middleware
const { authenticate } = require("../../../middlewares/authenticate");

// Policies
const relationshipPolicy = require("../../../policies/relationshipPolicies");


// Add
MainRelationshipRouter.route('/')
  .post(authenticate(), relationshipPolicy.post, require('./addFriend'));

// Accept
MainRelationshipRouter.route('/')
  .put(authenticate(), relationshipPolicy.put, require('./acceptFriend'));


// Remove
MainRelationshipRouter.route('/')
  .delete(authenticate(), relationshipPolicy.delete, require('./removeFriend'));


module.exports = MainRelationshipRouter;
