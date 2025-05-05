const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category_controller');

// GET /api/categories
router.get('/', categoryController.getCategories);

module.exports = router;
