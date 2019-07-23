
const express = require('express');
const router = express.Router();

const messagePolicie = require('../policies/messagePolicies');

const messagesController = require('../controllers/messagesController');
const typingController = require('./../controllers/TypingController')

//Middlewares
const channelVerification = require('./../middlewares/ChannelVerification');
const GDriveOauthClient = require('./../middlewares/GDriveOauthClient');
const URLEmbed = require('./../middlewares/URLEmbed');
const busboy = require('connect-busboy');
const {
	passportLogin,
	passportJWT
} = require('./../middlewares/passport');


router.route('/channels/:channelID')
	.get(passportJWT, channelVerification, messagesController.get)

	router.route('/:messageID/channels/:channelID')
	.delete(passportJWT, channelVerification, messagesController.delete)

	router.route('/:messageID/channels/:channelID')
	.patch(passportJWT, messagePolicie.update, channelVerification, messagesController.update, URLEmbed)

router.route('/channels/:channelID')
	.post(passportJWT, messagePolicie.post, channelVerification, messagesController.post, URLEmbed, GDriveOauthClient, busboy(), messagesController.postFormData,  )

router.route('/:channelID/typing')
	.post(passportJWT,channelVerification, typingController)

module.exports = router;