
const express = require('express');
const router = express.Router();

const loadMedia = require('../middlewares/loadMedia');


import { getAndRemoveAllRequests, ipRequestIncrement } from '../newRedisWrapper';





setInterval(async () => {
  const [requests, err] = await getAndRemoveAllRequests();
  if (requests) {
    for (const ip in requests) {
      const count = requests[ip];
      if (count >= 100) {
        console.log(`IP: ${ip} is sending a lot of requests (${count} in 60 seconds)`)
      }
    }
  }
}, 60000);



router.use('/*', async (req, res, next) => {
  const [count, err] = await ipRequestIncrement(req.userIP);
  if (count >= 150) {
    res.status(403).json({message: "You have been rate limited!"})
    return;
  }
  next();
})


router.use('/error_report', require('./errorReport'));
router.use('/user', require('./users'));
router.use('/devices', require('./devices'));
router.use('/servers', require('./servers'));
router.use('/channels', require('./channels'));
router.use('/themes', require('./themes').ThemeRouter)
router.use('/bots', require('./bots'))
router.use('/voice', require('./voice').VoiceRouter)

router.use('/explore', require('./explore'))

router.use('/messages', require('./messages'));

router.use('/settings', require('./settings'));

router.use('/files/*', require('./files'));
router.use('/media/*', loadMedia.default);

router.use('/admin', require('./admin'));
router.use('/tenor', require('./tenor').TenorRouter);

module.exports = router;