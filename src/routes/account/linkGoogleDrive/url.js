module.exports = async (req, res, next) => {
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
