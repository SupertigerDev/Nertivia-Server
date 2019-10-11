const {
	google
} = require('googleapis');
const User = require('./../models/users');
const config = require('./../config');

module.exports = async (req, res, next) => {
	const oauth2Client = new google.auth.OAuth2(
		config.googleDrive.client_id,
		config.googleDrive.client_secret,
		config.googleDrive.url
	);
	req.oauth2Client = oauth2Client;

	// check if GDriveRefreshToken exists in db
	if (!req.session['user'].GDriveRefreshToken) {
		const user = await User.findById(req.session['user']._id, {_id: 0}).select('GDriveRefreshToken');
		if (user && user.GDriveRefreshToken) {
			req.session['user'].GDriveRefreshToken = GDriveRefreshToken
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
