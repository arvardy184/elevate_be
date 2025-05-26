const db = require('../config/database');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
exports.findByEmail = async (email) => {
  return await prisma.user.findUnique({
    where: { email },
  });
};

exports.createUser = async ({ firstName, lastName, email, phoneNumber, password }) => {
  return await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      phoneNumber,
      password,
    },
  });
};
