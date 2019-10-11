const config = require('../../../config');
const Users = require('./../../../models/users');

const jwt = require('jsonwebtoken')

const DriveAPI = require('./../../../API/GDrive');

module.exports = async (req, res, next) => {
	const oauth2Client = req.oauth2Client;
	const {code, token} = req.body;
	try {
		// jwt token
		const decryptedToken = await jwt.verify(token, config.jwtSecret);


		const {tokens} = await oauth2Client.getToken (code);
		const refresh_token = tokens.refresh_token;

		

		const addToken = await Users.updateOne ({ _id: decryptedToken.sub }, {
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
			io.in(decryptedToken.sub).emit('googleDrive:linked');
			return res.json ({ success: true })
		} else {
			return res.json ({ success: false })
		}

	} catch (e) {
		return res.status(403).json ({ success: false })
	}
};
