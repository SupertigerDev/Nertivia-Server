
const express = require('express');
const router = express.Router();

const messagePolicie = require('../policies/messagePolicies');

const ServerController = require('../controllers/ServerController');


//Middlewares
const UserPresentVerification = require ('./../middlewares/UserPresentVerification')
const ChannelVerification = require ('./../middlewares/ChannelVerification')
const GDriveOauthClient = require('./../middlewares/GDriveOauthClient');
const busboy = require('connect-busboy');
const {
	passportLogin,
	passportJWT
} = require('./../middlewares/passport');


router.route('/')
	.post( passportJWT, ServerController.post )

router.route('/channels/:server_id')
	.get( passportJWT, UserPresentVerification,ServerController.getChannels )

router.route('/:server_id/invite')
	.post( passportJWT, UserPresentVerification, ServerController.createInvite )
router.route('/:server_id/invites')
	.get( passportJWT, UserPresentVerification, ServerController.getInvites )

router.route('/:server_id/channel')
	.put( passportJWT, UserPresentVerification, ServerController.createChannel )
	
router.route('/:server_id/channels/:channel_id')
	.patch( passportJWT, UserPresentVerification, ServerController.updateChannel )

router.route('/:server_id/channels/:channel_id')
	.delete( passportJWT, UserPresentVerification, ServerController.deleteChannel )
	
router.route('/:server_id')
	.delete( passportJWT, UserPresentVerification, ServerController.deleteLeaveServer )


router.route('/invite/:invite_code')
	.get(ServerController.getInviteDetail )

router.route('/invite/:invite_code')
	.post( passportJWT, ServerController.joinServer )



module.exports = router;