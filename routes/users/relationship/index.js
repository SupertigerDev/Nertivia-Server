const MainRelationshipRouter = require("express").Router();

// Middleware
const { passportJWT } = require("./../../../middlewares/passport");

// Policies
const relationshipPolicy = require("./../../../policies/relationshipPolicies");


// Add
MainRelationshipRouter.route('/')
  .post(passportJWT, relationshipPolicy.post, require('./addFriend'));

// Accept
MainRelationshipRouter.route('/')
  .put(passportJWT, relationshipPolicy.put, require('./acceptFriend'));


// Remove
MainRelationshipRouter.route('/')
  .delete(passportJWT, relationshipPolicy.delete, require('./removeFriend'));


module.exports = MainRelationshipRouter;
