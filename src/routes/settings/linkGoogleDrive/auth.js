import { Users } from "../../../models/Users";
import { GOOGLE_DRIVE_LINKED } from "../../../ServerEventNames";

const jwt = require('jsonwebtoken')

const DriveAPI = require('../../../API/GDrive');

module.exports = async (req, res, next) => {
	const oauth2Client = req.oauth2Client;
	const {code, token} = req.body;
	try {
		// jwt token
		let decryptedToken = await jwt.verify(process.env.JWT_HEADER + token, process.env.JWT_SECRET);
		decryptedToken = decryptedToken.split("-")[0];

		const {tokens} = await oauth2Client.getToken (code);
		const refresh_token = tokens.refresh_token;

		

		const addToken = await Users.updateOne ({ id: decryptedToken }, {
			$set: {
				GDriveRefreshToken: refresh_token
			}
		})
		oauth2Client.setCredentials({refresh_token})

		//create a folder.
		const {ok, error, result} = await DriveAPI.createFolder( oauth2Client );
		if ( ok ) {
			const io = req.io
			io.in(decryptedToken).emit(GOOGLE_DRIVE_LINKED);
			return res.json ({ success: true })
		} else {
			return res.json ({ success: false })
		}

	} catch (e) {
		return res.status(403).json ({ success: false })
	}
};
