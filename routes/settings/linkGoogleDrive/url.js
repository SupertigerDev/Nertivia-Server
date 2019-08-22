module.exports = async (req, res, next) => {
  const oauth2Client = req.oauth2Client;
  const scopes = ["https://www.googleapis.com/auth/drive.file"];
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent"
  });
  res.json({ url: url });
};
