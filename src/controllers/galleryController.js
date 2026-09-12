'use strict';

const content = require('../content');

/** GET /api/gallery — the picture grid, with its filter categories. */
exports.list = (req, res) => {
  const { category } = req.query;
  let items = content.gallery;
  if (category) {
    items = items.filter((g) => g.category.toLowerCase() === String(category).toLowerCase());
  }
  res.json({ count: items.length, categories: content.galleryCategories, items });
};
