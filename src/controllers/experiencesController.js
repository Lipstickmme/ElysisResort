'use strict';

const content = require('../content');

/** GET /api/experiences — everything there is to do here. */
exports.list = (req, res) => {
  const { category } = req.query;
  let experiences = content.experiences;
  if (category) {
    experiences = experiences.filter((e) => e.category.toLowerCase() === String(category).toLowerCase());
  }
  res.json({ count: experiences.length, experiences });
};

/** GET /api/experiences/:id */
exports.getById = (req, res, next) => {
  const experience = content.experienceById(req.params.id);
  if (!experience) {
    const err = new Error(`No experience with id "${req.params.id}"`);
    err.status = 404;
    err.code = 'not_found';
    return next(err);
  }
  const after = content.nextExperience(experience.id);
  return res.json({ experience, next: { id: after.id, title: after.title } });
};
