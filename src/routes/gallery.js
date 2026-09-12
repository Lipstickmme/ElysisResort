'use strict';

const router = require('express').Router();
const ctrl = require('../controllers/galleryController');

router.get('/', ctrl.list);

module.exports = router;
