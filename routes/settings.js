
const express = require('express');
const router = express.Router();

//Polciies
const settingsPolicies = require ('../policies/settingsPolicies');

// routes
const userSettingsController = require('../controllers/userSettingsController');
const GDriveSettings = require('./GDriveSettings')

//Middlewares
const GDriveOauthClient = require('./../middlewares/GDriveOauthClient');
const busboy = require('connect-busboy');
const {
	passportLogin,
	passportJWT
} = require('./../middlewares/passport');


router.use('/drive',
  passportJWT, GDriveOauthClient, GDriveSettings)

  router.route('/status')
  .post(settingsPolicies.status, passportJWT, userSettingsController.changeStatus)

router.route('/avatar')
  .post( passportJWT, GDriveOauthClient, busboy(), userSettingsController.changeAvatar)

router.route('/emoji')
  .post( passportJWT, GDriveOauthClient, busboy(), userSettingsController.addEmojis)

  router.route('/emoji')
  .delete( passportJWT, userSettingsController.removeEmoji )

  router.route('/emoji')
  .put( passportJWT, userSettingsController.renameEmoji );

module.exports = router;