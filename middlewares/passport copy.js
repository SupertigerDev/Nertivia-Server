const passport = require('passport');
module.exports = {
	passportLogin: (req, res, next) => {
		passport.authenticate('local', { session: false }, (err, data) => {
			if (data.status === false) {
				return res.status(401).send(data);
			}else{
				req.user = data
				next()
			}
		})(req, res, next)
	},
	authenticate: (req, res, next) => {
		// check if details exist in redis session
		if (req.session["user"]) {
			req.user = req.session["user"];
			return next();
		}
		passport.authenticate('jwt', { session: false }, (error, decryptToken, jwtError) => {
			if(typeof (jwtError) === 'object'){
				return res.status(401).send({
					status: false,
					message: jwtError.message
				});
			} else if (!error) {
				if(decryptToken.status === false) {
					return res.status(401).send({
						status: false,
						message: decryptToken.message
					});
				}
				req.user = decryptToken
				req.session["user"] = decryptToken;

				next()
			}
		})(req, res, next);
	}
}