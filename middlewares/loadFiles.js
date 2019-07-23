const request = require("request");
const config = require("./../config");
const path = require('path');

module.exports = (req, res, next) => {
  const id = req.params["0"];

  const url = `https://drive.google.com/uc?export=view&id=${id}`;

  const requestSettings = {
    url,
    method: "GET",
    encoding: null
  };
	const reqImages = request(requestSettings)
		.on('response', (resp, body) => {
      if (resp && resp.statusCode !== 200) {
        reqImages.abort();
        next();
        return;
      }
      res.set('Cache-Control', 'public, max-age=31536000');
		})
    .on("complete", () => {
      res.end();
    });

    reqImages.pipe(res)
};
