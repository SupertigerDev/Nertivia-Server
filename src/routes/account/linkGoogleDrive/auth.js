import { Users } from "../../../models/Users";
import { GOOGLE_DRIVE_LINKED } from "../../../ServerEventNames";

const jwt = require('jsonwebtoken')

import * as GoogleDrive from '../../../common/GoogleDrive';

module.exports = async (req, res, next) => {
	const oAuth2Client = req.oAuth2Client;
	const {code, token} = req.body;
	try {
		// jwt token
		let decryptedToken = jwt.verify(process.env.JWT_HEADER + token, process.env.JWT_SECRET);
		decryptedToken = decryptedToken.split("-")[0];

		const {tokens} = await oAuth2Client.getToken(code);
		const refresh_token = tokens.refresh_token;

	

		await Users.updateOne ({ id: decryptedToken }, {
			$set: {
				GDriveRefreshToken: refresh_token
			}
		})
		oAuth2Client.setCredentials({refresh_token})

		//create a folder.
		await GoogleDrive.createFolder( oAuth2Client );
		req.io.in(decryptedToken).emit(GOOGLE_DRIVE_LINKED);
		return res.json({ success: true })

	} catch (e) {
		return res.status(403).json ({ success: false })
	}
};
