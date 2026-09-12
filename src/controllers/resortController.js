'use strict';

const content = require('../content');

/** GET /api/resort — the house facts: the story, the numbers, how to arrive. */
exports.get = (req, res) => {
  const { resort } = content;
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.json({
    name: resort.name,
    legalName: resort.legalName,
    tagline: resort.tagline,
    place: resort.place,
    lede: resort.lede,
    story: resort.story,
    facts: resort.facts,
    stats: resort.stats,
    arrival: resort.arrival,
    rates: resort.rates,
    residences: content.suites.length,
    collections: content.collections,
  });
};
