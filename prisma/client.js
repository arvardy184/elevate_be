const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

module.exports = prisma;