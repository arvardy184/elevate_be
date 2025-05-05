const prisma = require('../prisma/client');

// GET /api/categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany();
    return res.status(200).json({ categories });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
};
