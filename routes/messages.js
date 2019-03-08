
const express = require('express');
const router = express.Router();

const messagePolicie = require('../policies/messagePolicies');

const messagesController = require('../controllers/messagesController');
const typingController = require('./../controllers/TypingController')

//Middlewares
const GDriveOauthClient = require('./../middlewares/GDriveOauthClient');
const busboy = require('connect-busboy');
const {
	passportLogin,
	passportJWT
} = require('./../middlewares/passport');


router.route('/:channelID')
	.get(passportJWT, messagesController.get)

router.route('/:channelID')
	.post(passportJWT, messagesController.post, GDriveOauthClient, busboy(), messagesController.postFormData, messagePolicie.post, )

router.route('/:channelID/typing')
	.post(passportJWT, typingController)

module.exports = router;