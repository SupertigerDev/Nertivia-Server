
const express = require('express');
const router = express.Router();

const loadMedia = require('./../middlewares/loadMedia');


import { getAndRemoveAllRequests, ipRequestIncrement } from '../newRedisWrapper';
import avatars from './avatars';





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
  if (count >= 500) {
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
router.use('/themes', require('./themes'))
router.use('/bots', require('./bots'))
router.use('/voice', require('./voice').default)

router.use('/explore', require('./explore'))

router.use('/messages', require('./messages'));

router.use('/settings', require('./settings'));

router.use('/avatars', avatars);
router.use('/files/*', require('./files'));
router.use('/media/*', loadMedia);

router.use('/admin', require('./admin'));

module.exports = router;