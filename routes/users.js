const express = require('express');
const router = express.Router();

const UsersController = require('../controllers/users');
const authenticationController = require('../controllers/authenticationController')
const relationshipController = require('../controllers/relationshipController')
const surveyController = require('../controllers/surveyController');


//middlewares
const relationshipPolicies = require('../policies/relationshipPolicies');
const authenticationPolicies = require('../policies/authenticationPolicies');
const reCaptchaPolicie = require('../policies/reCaptchaPolicie');
const surveyPolicie = require('../policies/surveyPolicies')
const UserPolicies = require('../policies/UserPolicies')
const GDriveOauthClient = require('./../middlewares/GDriveOauthClient');
const {
  passportLogin,
  passportJWT
} = require('./../middlewares/passport');


// users
router.route('/register')
  .post(reCaptchaPolicie, authenticationPolicies.register, authenticationController.register);

router.route('/login')
  .post(authenticationPolicies.login, reCaptchaPolicie, passportLogin, authenticationController.login)

router.route('/')
  .patch(passportJWT, GDriveOauthClient, UserPolicies.updateUser, UsersController.updateUser)


router.route('/relationship')
  .post(relationshipPolicies.post, passportJWT, relationshipController.addRecipient);

router.route('/relationship')
  .put(relationshipPolicies.put, passportJWT, relationshipController.acceptRecipient);

router.route('/relationship')
  .delete(relationshipPolicies.delete, passportJWT, relationshipController.removeRecipient);

router.route('/survey')
  .put(surveyPolicie.put, passportJWT, surveyController.put)

router.route('/survey/skip')
  .delete(passportJWT, surveyController.skip)

router.route('/survey')
  .get(passportJWT, surveyController.get)

router.route('/:uniqueID')
.get(passportJWT, UsersController.details);

router.route('/').get(passportJWT, UsersController.details);

module.exports = router;