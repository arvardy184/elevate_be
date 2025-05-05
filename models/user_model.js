const db = require('../config/database');
// models/user_model.js
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

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
