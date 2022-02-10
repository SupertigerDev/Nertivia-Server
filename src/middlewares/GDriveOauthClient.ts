
import { NextFunction, Request, Response } from 'express';
import {google} from 'googleapis';
import { Users } from "../models/Users";

export async function GDriveOauthClient(req: Request, res: Response, next: NextFunction) {
	const oAuth2Client = new google.auth.OAuth2(
		process.env.DRIVE_CLIENT_ID,
		process.env.DRIVE_CLIENT_SECRET,
		process.env.DRIVE_URL
	);
	req.oAuth2Client = oAuth2Client;

	if (!req.session || !req.session['user']) return next()

	if (!req.session['user'].GDriveRefreshToken) {
		// check if GDriveRefreshToken exists in db
		const user = await Users.findById(req.session['user']._id, {_id: 0}).select('GDriveRefreshToken');
		if (user?.GDriveRefreshToken) {
			req.session['user'].GDriveRefreshToken = user.GDriveRefreshToken
		}
	}

	if (req.session['user'].GDriveRefreshToken && !req.session['GDriveTokens']) {
		try {
			oAuth2Client.setCredentials({
				refresh_token: req.session['user'].GDriveRefreshToken
			})
			const accessToken = await oAuth2Client.getAccessToken();
			req.session['GDriveTokens'] = accessToken.res?.data;
			oAuth2Client.setCredentials(accessToken.res?.data);
		} catch (e) {
			console.log(e)
		}
	} else if (req.session['GDriveTokens']){
		oAuth2Client.setCredentials(req.session['GDriveTokens']);
	}

	next()
}
