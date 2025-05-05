const db = require('../config/database');
const prisma = require('../prisma/client');
exports.findByEmail = async (email) => {
  return await prisma.user.findUnique({
    where: { email },
  });
};

exports.createUser = async ({ firstName, lastName, email, password }) => {
  return await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      password,
    },
  });
};
