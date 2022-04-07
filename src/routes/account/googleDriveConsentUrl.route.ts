import { Request, Response, Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { GoogleDriveOAuth } from "../../middlewares/GoogleDriveOAuth";

export async function googleDriveConsentUrl(Router: Router) {
  Router.route("/drive/url")
  .get(GoogleDriveOAuth, authenticate(), route);
}

export async function route(req: Request, res: Response) {
  const oAuth2Client = req.oAuth2Client;
  const scopes = ["https://www.googleapis.com/auth/drive.file"];
  const url = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
    state: req.headers.authorization
  });
  res.json({ url: url });
};
