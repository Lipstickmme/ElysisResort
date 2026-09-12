'use strict';

const router = require('express').Router();
const ctrl = require('../controllers/experiencesController');

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);

module.exports = router;
