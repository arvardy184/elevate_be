const prisma = require('./client'); // pastikan prisma/client.js sudah singleton
/*************  ✨ Windsurf Command ⭐  *************/
/**
 * Main function to seed database
 * 
 * Steps:
 * 1. Seed categories
 * 2. Seed courses
 */
/*******  7c106f36-c034-4653-a31b-97b207886296  *******/async function main() {
  // 1. Seed Categories
  const categories = await prisma.category.createMany({
    data: [
      { name: 'Design' },
      { name: 'Web Development' },
      { name: 'Marketing' },
      { name: 'Business' }
    ],
    skipDuplicates: true // biar kalau udah ada, gak error
  });

  console.log('Seeded categories!');

  // 2. Get categories
  const designCategory = await prisma.category.findFirst({ where: { name: 'Design' } });
  const devCategory = await prisma.category.findFirst({ where: { name: 'Web Development' } });

  // 3. Seed Courses
  await prisma.course.createMany({
    data: [
      {
        title: 'Intro to UI/UX',
        description: 'Belajar dasar-dasar UI/UX untuk pemula',
        thumbnail: 'https://via.placeholder.com/300',
        isPaid: false,
        price: 0,
        categoryId: designCategory.id,
        createdById: 1 // ganti sesuai ID admin atau user pertama
      },
      {
        title: 'Fullstack Web Developer',
        description: 'Belajar membangun aplikasi web fullstack dari nol',
        thumbnail: 'https://via.placeholder.com/300',
        isPaid: true,
        price: 250000,
        categoryId: devCategory.id,
        createdById: 1
      }
    ],
    skipDuplicates: true
  });

  console.log('Seeded courses!');
}

main()
  .then(() => {
    console.log('Seeding selesai!');
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
