'use strict';

const content = require('../content');

/** GET /api/suites — the residences, optionally one collection of them. */
exports.list = (req, res) => {
  const { collection } = req.query;
  let suites = content.suites;
  if (collection) {
    suites = suites.filter((s) => s.collection.toLowerCase() === String(collection).toLowerCase());
  }
  res.json({ count: suites.length, collections: content.collections, suites });
};

/** GET /api/suites/:id — one residence, plus the one after it. */
exports.getById = (req, res, next) => {
  const suite = content.suiteById(req.params.id);
  if (!suite) {
    const err = new Error(`No residence with id "${req.params.id}"`);
    err.status = 404;
    err.code = 'not_found';
    return next(err);
  }
  const after = content.nextSuite(suite.id);
  return res.json({ suite, next: { id: after.id, name: after.name } });
};
