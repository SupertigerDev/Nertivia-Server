const express = require('express');
const { check, validationResult } = require('express-validator/check');
const router = require('express-promise-router')();
const passport = require('passport');
const passportConf = require('../passport');
const path = require('path');


const relationshipPolicies = require ('../policies/relationshipPolicies');
const authenticationPolicies = require ('../policies/authenticationPolicies');
const settingsPolicies = require ('../policies/settingsPolicies');
const reCaptchaPolicie = require('../policies/reCaptchaPolicie');

const UsersController = require('../controllers/users');
const authenticationController = require ('../controllers/authenticationController')
const relationshipController = require ('../controllers/relationshipController')
const channelsController = require('../controllers/channelsController');
const messagesController = require('../controllers/messagesController');
const userSettingsController = require('../controllers/userSettingsController');
const typingController = require('./../controllers/TypingController')

const passportLogin = (req, res, next) => {
  passport.authenticate('local', { session: false }, (err, data) => {
    if (data.status === false) {
      return res.status(401).send(data);
    }else{
      req.user = data
      next()
    }
  })(req, res, next)
}

const passportJWT = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (error, decryptToken, jwtError) => {
    if(typeof (jwtError) === 'object'){
      return res.status(401).send({
        status: false,
        message: jwtError.message
      });
    } else if (!error) {
      if(decryptToken.status === false) {
        return res.status(401).send({
          status: false,
          message: decryptToken.message
        });
      }
      req.user = decryptToken
      next()
    }
  })(req, res, next);
}

// users
router.route('/user/register')
  .post(reCaptchaPolicie, authenticationPolicies.register, authenticationController.register);

router.route('/user/login')
  .post(reCaptchaPolicie, authenticationPolicies.login, passportLogin, authenticationController.login)

router.route('/user/details')
.get(passportJWT, UsersController.details);

router.route('/user/relationship')
  .post(relationshipPolicies.post, passportJWT, relationshipController.addRecipient);

router.route('/user/relationship')
  .put(relationshipPolicies.put, passportJWT, relationshipController.acceptRecipient);

router.route('/user/relationship')
  .delete(relationshipPolicies.delete, passportJWT, relationshipController.removeRecipient);

//channels 
router.route('/channels/:channelID')
  .post(passportJWT, channelsController.post)

// messages
router.route('/messages/:channelID')
  .get(passportJWT, messagesController.get)

router.route('/messages/:channelID')
  .post(passportJWT, messagesController.post)

router.route('/messages/:channelID/typing')
.post(passportJWT, typingController)
  
// settings

router.route('/settings/status')
  .post(settingsPolicies.status, passportJWT, userSettingsController.changeStatus)

router.route('/settings/avatar')
  .post( passportJWT, userSettingsController.changeAvatar)

// avatar
router.use('/avatars',
  express.static(path.join(__dirname, '../public/avatars'), {extensions:['jpg']}));
  
// if avatar is not found, display default avatar.
router.get('/avatars/*', 
  function(req, res){ res.sendFile(path.join(__dirname, '../public/avatars/default.png')); })

module.exports = router;