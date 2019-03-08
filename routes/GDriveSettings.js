const Users = require('./../models/users');

const express = require('express');
const router = express.Router();
const DriveAPI = require('./../API/GDrive');

//send consent url to client.
router.route('/url').get((req, res) => {
	const oauth2Client = req.oauth2Client;
	const scopes = [
		'https://www.googleapis.com/auth/drive.file'
	];
	const url = oauth2Client.generateAuthUrl({
		access_type: 'offline',
		scope: scopes,
		prompt: 'consent'
	});
	res.json({url: url});
})

router.route('/auth').post( async (req, res) => {
	const oauth2Client = req.oauth2Client;
	const {code} = req.body;
	try {
		const {tokens} = await oauth2Client.getToken (code);
		const refresh_token = tokens.refresh_token;


		const addToken = await Users.updateOne ({ _id: req.user._id }, {
			$set: {
				GDriveRefreshToken: refresh_token
			}
		})
		req.session['user'].GDriveRefreshToken = refresh_token;
		oauth2Client.setCredentials({refresh_token})

		//create a folder.
		const {ok, error, result} = await DriveAPI.createFolder( oauth2Client );
		if ( ok ) {
			const io = req.io
			io.in(req.user.uniqueID).emit('googleDrive:linked');
			return res.json ({ success: true })
		} else {
			return res.json ({ success: false })
		}

	} catch (e) {
		return res.status(403).json ({ success: false })
	}
})

module.exports = router;