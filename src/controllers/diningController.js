'use strict';

const content = require('../content');

/** GET /api/dining — the restaurants and bars. */
exports.list = (req, res) => {
  res.json({ count: content.dining.length, venues: content.dining });
};

/** GET /api/dining/:id */
exports.getById = (req, res, next) => {
  const venue = content.diningById(req.params.id);
  if (!venue) {
    const err = new Error(`No venue with id "${req.params.id}"`);
    err.status = 404;
    err.code = 'not_found';
    return next(err);
  }
  return res.json(venue);
};
