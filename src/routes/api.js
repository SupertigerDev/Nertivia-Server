
const express = require('express');
const router = express.Router();

const loadMedia = require('./../middlewares/loadMedia');


import avatars from './avatars';

let requests = {}

setInterval(() => {
  for (let index = 0; index < Object.keys(requests).length; index++) {
    const ip = Object.keys(requests)[index]
    const requestSentCount = Object.values(requests)[index].count
    const param = Object.values(requests)[index].param
    if (requestSentCount >= 100) {
      console.log(`...${ip.slice(6, ip.length)} is sending a lot of requests (${requestSentCount} in 60 seconds) at ${param}`)
    }
  }
  requests = {};
}, 60000);


router.use('/*', (req, res, next) => {
  if (requests[req.userIP]) {
    requests[req.userIP] = { param: req.originalUrl, count: requests[req.userIP].count + 1 }
  } else {
    requests[req.userIP] = { param: req.originalUrl, count: 1 }
  }
  next();
})

router.use('/user', require('./users'));
router.use('/devices', require('./devices'));
router.use('/servers', require('./servers'));
router.use('/channels', require('./channels'));
router.use('/themes', require('./themes'))
router.use('/bots', require('./bots'))

router.use('/explore', require('./explore'))

router.use('/messages', require('./messages'));

router.use('/settings', require('./settings'));

router.use('/avatars', avatars);
router.use('/files/*', require('./files'));
router.use('/media/*', loadMedia);

router.use('/admin', require('./admin'));

module.exports = router;