import { Users } from "../../models/Users";
import { GOOGLE_DRIVE_LINKED } from "../../ServerEventNames";

import * as GoogleDrive from '../../common/GoogleDrive';
import { Request, Response, Router } from "express";
import { GoogleDriveOAuth } from "../../middlewares/GoogleDriveOAuth";
import { decodeToken } from "../../utils/JWT";

export async function googleDriveAuthenticate(Router: Router) {
	Router.route("/drive/auth")
  .post(GoogleDriveOAuth, route);
}

export async function route(req: Request, res: Response) {
	const oAuth2Client = req.oAuth2Client;
	const {code, token} = req.body;
	try {

		const {id} = await decodeToken(token);

		const {tokens} = await oAuth2Client.getToken(code);
		const refresh_token = tokens.refresh_token;

	

		await Users.updateOne ({ id }, {
			$set: {
				GDriveRefreshToken: refresh_token
			}
		})
		oAuth2Client.setCredentials({refresh_token})

		//create a folder.
		await GoogleDrive.createFolder( oAuth2Client );
		req.io.in(id).emit(GOOGLE_DRIVE_LINKED);
		return res.json({ success: true })

	} catch (e) {
		return res.status(403).json ({ success: false })
	}
};
