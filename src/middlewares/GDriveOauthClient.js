const {
	google
} = require('googleapis');
import { Users } from "../models/Users";

module.exports = async (req, res, next) => {
	const oauth2Client = new google.auth.OAuth2(
		process.env.DRIVE_CLIENT_ID,
		process.env.DRIVE_CLIENT_SECRET,
		process.env.DRIVE_URL
	);
	req.oauth2Client = oauth2Client;

	if (!req.session || !req.session['user']) return next()
	// check if GDriveRefreshToken exists in db
	if (!req.session['user'].GDriveRefreshToken) {
		const user = await Users.findById(req.session['user']._id, {_id: 0}).select('GDriveRefreshToken');
		if (user && user.GDriveRefreshToken) {
			req.session['user'].GDriveRefreshToken = user.GDriveRefreshToken
		}
	}

	if (req.session['user'].GDriveRefreshToken && !req.session['GDriveTokens']) {
		try {
			oauth2Client.setCredentials({
				refresh_token: req.session['user'].GDriveRefreshToken
			})
			const request_access_token = await oauth2Client.getAccessToken();
			req.session['GDriveTokens'] = request_access_token.res.data;
			oauth2Client.setCredentials(request_access_token.res.data);
		} catch (e) {
			console.log(e)
		}
	} else if (req.session['GDriveTokens']){
		oauth2Client.setCredentials(req.session['GDriveTokens']);
	}

	next()
}
