'use strict';

const router = require('express').Router();
const ctrl = require('../controllers/reservationsController');

router.post('/', ctrl.create);

module.exports = router;
