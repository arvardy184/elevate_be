const prisma = require('./client');
const bcrypt = require('bcrypt');

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

  
async function createCategories() {
    const categories = [
      "Web Development",
      "Mobile Development",
      "Data Science",
      "UI/UX Design",
      "Game Development",
      "Cyber Security",
      "Cloud Computing",
      "Digital Marketing"
    ];
  
    for (const category of categories) {
      try {
        // Cek apakah kategori sudah ada - gunakan query sederhana
        const existingCategory = await prisma.category.findFirst({
          where: { name: category }
        });

        if (!existingCategory) {
          // Jika belum ada, buat baru
          await prisma.category.create({
            data: { name: category }
          });
          console.log(`Category "${category}" created successfully`);
        } else {
          console.log(`Category "${category}" already exists, skipping`);
        }
      } catch (error) {
        // Hanya log error jika bukan karena unique constraint
        if (error.code !== 'P2002') {
          console.error(`Error creating category ${category}:`, error);
        } else {
          console.log(`Category "${category}" already exists (caught by constraint)`);
        }
      }
    }
    console.log("Categories seeding completed!");
  }
  
  createCategories();

  async function createRoadmaps() {
    // Create Roadmaps
    try {
      const roadmap1 = await prisma.roadmap.create({
        data: {
          name: "Web Developer Roadmap",
          description: "Step by step guide to become a full-stack web developer.",
          rewardVoucher: "10% OFF for the next course",
        },
      });
    
      const roadmap2 = await prisma.roadmap.create({
        data: {
          name: "Data Science Roadmap",
          description: "From Python basics to Machine Learning.",
          rewardVoucher: "15% OFF for the next course",
        },
      });
    
      // Add courses to roadmaps (example)
      const webDevCourses = await prisma.course.findMany({
        where: {
          categoryId: 1, // Web Development category
        },
      });
    
      const dataScienceCourses = await prisma.course.findMany({
        where: {
          categoryId: 3, // Data Science category
        },
      });
    
      // RoadmapCourse linking - dipakai roadmapcourse dengan c kecil
      for (const course of webDevCourses) {
        await prisma.roadmapcourse.create({
          data: {
            roadmapId: roadmap1.id,
            courseId: course.id,
            order: 1 // you can set different order for each course
          }
        });
      }
    
      for (const course of dataScienceCourses) {
        await prisma.roadmapcourse.create({
          data: {
            roadmapId: roadmap2.id,
            courseId: course.id,
            order: 1 // you can set different order for each course
          }
        });
      }
    
      console.log("Roadmaps and RoadmapCourses seeded!");
    } catch (error) {
      console.error("Error creating roadmaps:", error);
    }
  }
  
  createRoadmaps();
  
  async function createVouchers() {
    try {
      // Cari user pertama untuk contoh
      const user = await prisma.user.findFirst();
      
      if (!user) {
        console.log("Tidak ada user untuk memberikan voucher. Buat user terlebih dahulu.");
        return;
      }
      
      // Data voucher yang akan dibuat
      const voucherData = [
        {
          code: "FIRST10",
          discount: 10,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          userId: user.id,
          isUsed: false
        },
        {
          code: "NEXT15",
          discount: 15, 
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          userId: user.id,
          isUsed: false
        },
      ];
      
      // Cek dan buat voucher satu per satu, melewati yang sudah ada
      for (const voucher of voucherData) {
        try {
          // Cek apakah voucher sudah ada dengan Prisma Client
          const existingVoucher = await prisma.voucher.findFirst({
            where: { code: voucher.code }
          });
          
          if (!existingVoucher) {
            await prisma.voucher.create({
              data: voucher
            });
            console.log(`Voucher ${voucher.code} created successfully`);
          } else {
            console.log(`Voucher ${voucher.code} already exists, skipping`);
          }
        } catch (err) {
          if (err.code === 'P2002') {
            console.log(`Voucher ${voucher.code} already exists (constraint error)`);
          } else {
            console.error(`Error creating voucher ${voucher.code}:`, err);
          }
        }
      }
      console.log("Vouchers seeded successfully!");
    } catch (error) {
      console.error("Error seeding vouchers:", error);
    }
  }
  
  createVouchers();
  
  async function createRoadmapMatcher() {
    try {
      const keywords = [
        { field: "Web Development", tags: ["html", "css", "javascript", "react", "nodejs"] },
        { field: "Data Science", tags: ["python", "machine learning", "deep learning", "pandas", "tensorflow"] },
        { field: "Mobile Development", tags: ["flutter", "android", "ios", "react native", "swift"] },
        { field: "UI/UX Design", tags: ["figma", "sketch", "wireframing", "user research"] },
        { field: "Cloud Computing", tags: ["aws", "azure", "cloud security", "cloud deployment"] },
      ];
      
      console.log("Mencoba membuat RoadmapMatcher...");
      
      // Cek apakah tabel RoadmapMatcher ada
      try {
        const tableExists = await prisma.$queryRaw`
          SELECT COUNT(*) as count 
          FROM information_schema.tables 
          WHERE table_schema = DATABASE() 
          AND table_name = 'RoadmapMatcher'
        `;
        
        const hasTable = tableExists[0].count > 0;
        
        if (!hasTable) {
          console.log("Tabel RoadmapMatcher tidak ditemukan di database");
          console.log("Roadmap Matcher seeding skipped - table doesn't exist");
          return;
        }
      } catch (error) {
        console.error("Error checking RoadmapMatcher table:", error);
        console.log("Roadmap Matcher seeding skipped due to error");
        return;
      }
      
      for (const { field, tags } of keywords) {
        try {
          // Coba cari roadmap dengan nama field
          const roadmap = await prisma.roadmap.findFirst({
            where: { name: { contains: field } }
          });
          
          if (roadmap) {
            console.log(`Found roadmap '${roadmap.name}' for field '${field}'`);
            
            // Gunakan raw query untuk menambahkan data roadmap matcher
            for (const tag of tags) {
              try {
                await prisma.$executeRaw`
                  INSERT INTO RoadmapMatcher (keyword, roadmapId, matchField)
                  VALUES (${tag}, ${roadmap.id}, ${field})
                `;
                console.log(`Added tag '${tag}' for roadmap matcher`);
              } catch (err) {
                // Abaikan error duplicate key
                if (err.code !== 'P2010' && !err.message?.includes('Duplicate entry')) {
                  console.error(`Error adding tag '${tag}':`, err);
                } else {
                  console.log(`Tag '${tag}' already exists, skipping`);
                }
              }
            }
          } else {
            console.log(`No roadmap found for field '${field}', skipping`);
          }
        } catch (err) {
          console.error(`Error processing field '${field}':`, err);
        }
      }
      
      console.log("Roadmap Matcher keywords seeding completed!");
    } catch (error) {
      console.error("Error creating roadmap matchers:", error);
      console.log("Roadmap Matcher seeding failed");
    }
  }
  
  createRoadmapMatcher();
  



// Fungsi untuk membuat user jika tidak ada
async function createDummyUser() {
  try {
    // Cek apakah ada user
    const userCount = await prisma.user.count();
    
    if (userCount === 0) {
      // Buat user jika belum ada
      const hashedPassword = await bcrypt.hash('password123', 10);
      await prisma.user.create({
        data: {
          email: 'admin@example.com',
          password: hashedPassword,
          firstName: 'Admin',
          lastName: 'User',
          role: 'USER'
        }
      });
      console.log("Demo user created");
    } else {
      console.log("Users already exist, skipping user creation");
    }
  } catch (error) {
    console.error("Error creating demo user:", error);
  }
}

async function main() {
  // Buat user terlebih dahulu agar dapat digunakan oleh fungsi-fungsi lain
  await createDummyUser();
  
  // Jalankan fungsi seeder secara berurutan
  await createCategories();
  await createRoadmaps();
  await createVouchers();
  // Jalankan createRoadmapMatcher terakhir karena membutuhkan roadmap
  await createRoadmapMatcher();

  console.log("All seed data inserted!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
