const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const { ExtractJwt } = require('passport-jwt');
const LocalStrategy = require('passport-local').Strategy;
const config = require('./config');
const User = require('./models/users')

const newUser = (user) => {
  return {
    uniqueID: user.uniqueID,
    username: user.username,
    email: user.email,
    tag: user.tag,
    avatar: user.avatar,
    status: user.status,
    lastSeen: user.lastSeen,
    created: user.created,
    id: user._id
  }
}

module.exports = {newUser}


// JSON WEB TOKENS STRATEGY
passport.use(new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromHeader('authorization'),
    secretOrKey: config.jwtSecret
}, async (payload, done) => {
  try {
    // Find the user specified in token
    const user = await User.findOne({uniqueID: payload.sub});
    // If user doesn't exists, handle it
    if (!user) {
      return done(null, {status: false, message: "You are not permitted to do this action."});
    }

    // Otherwise, return the user
    done(null, newUser(user));
  } catch(error) {
    done(error, false);
  }
}));

// LOCAL STRATEGY
passport.use(new LocalStrategy({
  usernameField: 'email'
}, async (email, password, done) => {
  try {
    // Find the user given the email
    const user = await User.findOne({ email }).select('+password');
    
    // If not, handle it
    if (!user) {
      return done(null, { status: false, errors: [{msg: "Email is incorrect.", param: "email"}] });
    }
  
    // Check if the password is correct
    const isMatch = await user.isValidPassword(password);
  
    // If not, handle it
    if (!isMatch) {
      return done(null, { status: false, errors: [{msg: "Password is incorrect.", param: "password"}] });
    }
    
    // Otherwise, return the user
    done(null, newUser(user));
    } catch(error) {
      done(error, false);
    }
}));
  