const channelsController = require('../controllers/channelsController');
const express = require('express');
const router = express.Router();

//Middlewares
const {
	passportLogin,
	passportJWT
} = require('./../middlewares/passport');

router.route('/:channelID')
	.post(passportJWT, channelsController.post)

module.exports = router;