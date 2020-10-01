
const express = require('express');
const router = express.Router();

const loadMedia = require('./../middlewares/loadMedia');


import avatars from './avatars';

let requests = {}
let rateLimited = {}

setInterval(() => {
  for (let index = 0; index < Object.keys(requests).length; index++) {
    const ip = Object.keys(requests)[index]
    const requestSentCount = Object.values(requests)[index].count
    const param = Object.values(requests)[index].param
    if (requestSentCount >= 100) {
      console.log(`HashedIP: ${ip} is sending a lot of requests (${requestSentCount} in 60 seconds) at ${param}`)
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

  if (rateLimited[req.userIP] ||  requests[req.userIP].count >=500) {
    if (!rateLimited[req.userIP]) {
      rateLimited[req.userIP] = Date.now();
      console.log(`Rate limited HashedIP: ${req.userIP}`)
    }
    if (diff_minutes(rateLimited[req.userIP], Date.now()) > 5) {
      delete rateLimited[req.userIP];
      return next();
    }
    res.status(403).json({message: "You have been rate limited!"})
    return;
  }
  next();
})
function diff_minutes(dt2, dt1) {
  let diff =(dt2 - dt1) / 1000;
  diff /= 60;
  return Math.abs(Math.round(diff));
}

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