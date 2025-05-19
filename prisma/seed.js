const prisma = require('./client');
const bcrypt = require('bcrypt');

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
        await prisma.roadmapCourse.create({
          data: {
            roadmapId: roadmap1.id,
            courseId: course.id,
            order: 1 // you can set different order for each course
          }
        });
      }
    
      for (const course of dataScienceCourses) {
        await prisma.roadmapCourse.create({
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

async function createCourses() {
  try {
    const categories = await prisma.category.findMany();
    
    // Cari user admin terlebih dahulu
    const adminUser = await prisma.user.findFirst({
      where: { role: 'USER' }
    });

    if (!adminUser) {
      console.error("No admin user found. Please create a user first.");
      return;
    }

    const coursesData = [
      {
        title: "Flutter Development Bootcamp",
        description: "Belajar membuat aplikasi mobile cross-platform dengan Flutter dari dasar hingga mahir",
        price: 299000,
        categoryName: "Mobile Development",
        thumbnail: "https://example.com/flutter-thumb.jpg",
        isPaid: true
      },
      {
        title: "React.js Masterclass",
        description: "Kuasai React.js untuk membangun aplikasi web modern dan scalable",
        price: 249000,
        categoryName: "Web Development",
        thumbnail: "https://example.com/react-thumb.jpg",
        isPaid: true
      },
      {
        title: "Python untuk Data Science",
        description: "Pelajari Python untuk analisis data, machine learning, dan visualisasi",
        price: 399000,
        categoryName: "Data Science",
        thumbnail: "https://example.com/python-ds-thumb.jpg",
        isPaid: true
      },
      {
        title: "UI/UX Design Fundamentals",
        description: "Pelajari prinsip dasar desain UI/UX dan tools modern seperti Figma",
        price: 199000,
        categoryName: "UI/UX Design",
        thumbnail: "https://example.com/uiux-thumb.jpg",
        isPaid: true
      },
      {
        title: "AWS Cloud Practitioner",
        description: "Persiapkan diri untuk sertifikasi AWS Cloud Practitioner",
        price: 349000,
        categoryName: "Cloud Computing",
        thumbnail: "https://example.com/aws-thumb.jpg",
        isPaid: true
      }
    ];

    // Buat course satu per satu
    for (const courseData of coursesData) {
      try {
        const existingCourse = await prisma.course.findFirst({
          where: { title: courseData.title }
        });

        if (!existingCourse) {
          // Cari category berdasarkan nama
          const category = categories.find(c => c.name === courseData.categoryName);
          
          if (!category) {
            console.error(`Category "${courseData.categoryName}" not found for course "${courseData.title}"`);
            continue;
          }

          // Buat course sesuai schema
          await prisma.course.create({
            data: {
              title: courseData.title,
              description: courseData.description,
              price: courseData.price,
              thumbnail: courseData.thumbnail,
              isPaid: courseData.isPaid,
              category: {
                connect: { id: category.id }
              },
              users: {
                connect: { id: adminUser.id }
              }
            }
          });
          console.log(`Course "${courseData.title}" created successfully`);
        } else {
          console.log(`Course "${courseData.title}" already exists, skipping`);
        }
      } catch (error) {
        console.error(`Error creating course ${courseData.title}:`, error);
      }
    }

    console.log("Courses seeding completed!");
  } catch (error) {
    console.error("Error creating courses:", error);
  }
}

async function createLessons() {
  try {
    // Ambil semua course yang ada
    const courses = await prisma.course.findMany();
    
    // Template lesson untuk setiap course
    const lessonTemplates = {
      "Flutter Development Bootcamp": [
        { title: "Pengenalan Flutter", duration: 45, order: 1 },
        { title: "Setup Development Environment", duration: 30, order: 2 },
        { title: "Widget Dasar", duration: 60, order: 3 },
        { title: "State Management", duration: 90, order: 4 },
        { title: "Navigation & Routing", duration: 60, order: 5 }
      ],
      "React.js Masterclass": [
        { title: "React Fundamentals", duration: 60, order: 1 },
        { title: "Components & Props", duration: 45, order: 2 },
        { title: "Hooks & State", duration: 90, order: 3 },
        { title: "Context API", duration: 60, order: 4 },
        { title: "Redux Toolkit", duration: 120, order: 5 }
      ],
      "Python untuk Data Science": [
        { title: "Python Basics", duration: 60, order: 1 },
        { title: "NumPy Fundamentals", duration: 90, order: 2 },
        { title: "Pandas Deep Dive", duration: 120, order: 3 },
        { title: "Data Visualization", duration: 90, order: 4 },
        { title: "Machine Learning Intro", duration: 120, order: 5 }
      ]
    };

    // Buat lessons untuk setiap course
    for (const course of courses) {
      const lessons = lessonTemplates[course.title] || [];
      
      for (const lesson of lessons) {
        try {
          await prisma.lesson.create({
            data: {
              ...lesson,
              courseId: course.id,
              videoUrl: `https://example.com/videos/${course.id}/${lesson.order}.mp4`,
              description: `Lesson ${lesson.order}: ${lesson.title}`
            }
          });
          console.log(`Created lesson "${lesson.title}" for course "${course.title}"`);
        } catch (error) {
          console.error(`Error creating lesson for ${course.title}:`, error);
        }
      }
    }

    console.log("Lessons seeding completed!");
  } catch (error) {
    console.error("Error creating lessons:", error);
  }
}

async function createQuizzes() {
  try {
    const courses = await prisma.course.findMany();
    
    // Template quiz untuk setiap course
    const quizTemplates = {
      "Flutter Development Bootcamp": [
        {
          question: "Apa itu Flutter?",
          options: [
            "Framework untuk web development",
            "Framework untuk mobile development",
            "Framework untuk desktop development",
            "Semua jawaban benar"
          ],
          correctAnswer: "3",
          isLocked: false
        },
        {
          question: "Widget apa yang digunakan untuk menampilkan teks?",
          options: ["Container", "Text", "Row", "Column"],
          correctAnswer: "1",
          isLocked: false
        }
      ],
      "React.js Masterclass": [
        {
          question: "Apa itu React?",
          options: [
            "Database",
            "JavaScript Framework",
            "Programming Language",
            "Operating System"
          ],
          correctAnswer: "1",
          isLocked: false
        },
        {
          question: "Hook apa yang digunakan untuk state management?",
          options: ["useEffect", "useState", "useContext", "useReducer"],
          correctAnswer: "1",
          isLocked: false
        }
      ]
    };

    // Buat quiz untuk setiap course
    for (const course of courses) {
      const quizzes = quizTemplates[course.title] || [];
      
      for (const quiz of quizzes) {
        try {
          await prisma.quiz.create({
            data: {
              courseId: course.id,
              question: quiz.question,
              options: quiz.options,
              correctAnswer: quiz.correctAnswer,
              isLocked: quiz.isLocked
            }
          });
          console.log(`Created quiz question "${quiz.question}" for course "${course.title}"`);
        } catch (error) {
          console.error(`Error creating quiz for ${course.title}:`, error);
        }
      }
    }

    console.log("Quizzes seeding completed!");
  } catch (error) {
    console.error("Error creating quizzes:", error);
  }
}

async function main() {
  // Buat user terlebih dahulu
  await createDummyUser();
  
  // Jalankan fungsi seeder secara berurutan
  await createCategories();
  await createCourses();
  await createLessons();
  await createQuizzes();
  await createRoadmaps();
  await createVouchers();
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
