'use strict';

/**
 * API router. Mounts feature routers under /api.
 */

const router = require('express').Router();

const system = require('../controllers/systemController');

router.get('/health', system.health);
router.get('/public-config', system.publicConfig);
router.get('/site', require('../controllers/siteController').get);
router.get('/resort', require('../controllers/resortController').get);

router.use('/suites', require('./suites'));
router.use('/experiences', require('./experiences'));
router.use('/dining', require('./dining'));
router.use('/gallery', require('./gallery'));
router.use('/careers', require('./careers'));
router.use('/leadership', require('./leadership'));

router.use('/reservations', require('./reservations'));

router.use('/applications', require('./applications'));
router.use('/chat', require('./chat'));
router.use('/emails', require('./emails'));

module.exports = router;
