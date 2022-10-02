
const express = require('express');
const router = express.Router();
import loadMedia from '../middlewares/loadMedia';
import * as RateLimitCache from '../cache/rateLimit.cache';
import { Log } from '../utils/Log';



// Global rate limits
setInterval(async () => {
  const requests = await RateLimitCache.getAndRemoveAllGlobal();
  if (!requests) return;
  for (const ip in requests) {
    const count = requests[ip];
    if (count < 100) continue;
    Log.warn(`Rate limit ${ip} (${count} in 60 seconds)`)
  }
}, 60000)


router.use('/*', async (req, res, next) => {
  const count = await RateLimitCache.incrementGlobal(req.userIp);
  if (count > 150) {
    res.status(403).json({message: "You have been rate limited!"})
    return;
  }
  next();
})


// Routes

router.use('/error_report', require('./errorReport'));
router.use('/user', require('./users/User.router').UserRouter);
router.use('/devices', require('./devices'));
router.use('/servers', require('./servers'));
router.use('/channels', require('./channels/Channel.router').ChannelRouter);
router.use('/themes', require('./themes/Theme.router').ThemeRouter)
router.use('/bots', require('./bots/Bot.router').BotRouter)
router.use('/voice', require('./voice/Voice.router').VoiceRouter)

router.use('/explore', require('./explore'))

router.use('/account', require('./account/Account.router').AccountRouter);

router.use('/files/*', require('./files'));
router.use('/media/*', loadMedia);

router.use('/admin', require('./admin'));
router.use('/tenor', require('./tenor/Tenor.router').TenorRouter);

module.exports = router;