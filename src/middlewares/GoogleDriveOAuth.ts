
import { NextFunction, Request, Response } from 'express';
import {google} from 'googleapis';
import * as UserCache from '../cache/User.cache';
export async function GoogleDriveOAuth(req: Request, res: Response, next: NextFunction) {
  req.oAuth2Client = new google.auth.OAuth2(
		process.env.DRIVE_CLIENT_ID,
		process.env.DRIVE_CLIENT_SECRET,
		process.env.DRIVE_URL
	);

  const refreshToken = req.user.GDriveRefreshToken;
  if (!refreshToken) return next();
  const credentials = req.user.googleDriveCredentials;

  if (credentials) {
    req.oAuth2Client.setCredentials(credentials);
    return next();
  }
  req.oAuth2Client.setCredentials({
    refresh_token: refreshToken
  })
  const accessToken = await req.oAuth2Client.getAccessToken();
  await UserCache.updateUser(req.user.id, {googleDriveCredentials: accessToken.res?.data});
  req.oAuth2Client.setCredentials(accessToken.res?.data);
  next();
  
}