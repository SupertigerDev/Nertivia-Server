const express = require('express');
const router = express.Router()
const history = require('connect-history-api-fallback');

router.use("/", express.static('public/chatBeta'))
router.use("/", history({
  disableDotRule: true,
//  verbose: true - disable logging
}));

router.use("/", express.static('public/chatBeta'))


module.exports = router;