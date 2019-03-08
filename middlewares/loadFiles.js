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
		.on('response', resp => {
      if (resp.statusCode !== 200) {
        reqImages.abort();
        next();
      }
		})
    .on("complete", () => {
      res.end();
    });

    reqImages.pipe(res)
};
