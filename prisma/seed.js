// const { PrismaClient } = require('@prisma/client');
// const bcrypt = require('bcrypt');
// const prisma = new PrismaClient();

// async function main() {
//   const passwordHash = await bcrypt.hash('password123', 10);

//   // const user = await prisma.user.upsert({
//   //   where: { email: 'dummyuser@example.com' },
//   //   update: {},
//   //   create: {
//   //     email: 'dummyuser@example.com',
//   //     password: passwordHash,
//   //     firstName: 'Dummy',
//   //     lastName: 'User',
//   //   },
//   // });

//   let category = await prisma.category.findFirst({
//     where: { name: "Tech" },
//   });
  
//   if (!category) {
//     category = await prisma.category.create({
//       data: { name: "Tech" },
//     });
//   }
  

//   const course = await prisma.course.create({
//     data: {
//       title: 'Belajar Node.js',
//       description: 'Dasar-dasar backend development.',
//       thumbnail: 'https://example.com/image.png',
//       isPaid: false,
//       price: 0,
//       createdById: user.id,
//       categoryId: category.id,
//     },
//   });

//   const lesson = await prisma.lesson.create({
//     data: {
//       title: 'Intro Node.js',
//       content: 'Materi dasar',
//       courseId: course.id,
//       order: 1,
//     },
//   });

//   const quiz = await prisma.quiz.create({
//     data: {
//       question: 'Apa itu Node.js?',
//       options: {
//         a: 'Framework PHP',
//         b: 'Runtime JavaScript',
//         c: 'Database',
//       },
//       correctAnswer: 'b',
//       isLocked: false,
//       courseId: course.id,
//     },
//   });

//   console.log('✅ Seeder selesai.');
// }

// main()
//   .catch((e) => {
//     console.error(e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
