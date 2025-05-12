const db = require('../config/database');
const prisma = require('../prisma/client');
exports.findByEmail = async (email) => {
  return await prisma.user.findUnique({
    where: { email },
  });
};

exports.createUser = async ({ email,phoneNumber, password ,}) => {
  return await prisma.user.create({
    data: {
      email,
      phoneNumber,
      password,
    },
  });
};
