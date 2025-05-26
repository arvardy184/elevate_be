const prisma = require('./client');

async function seedAssessmentResults() {
  try {
    console.log('🌱 Seeding assessment results...');
    
    // Ambil user yang sudah ada
    const users = await prisma.user.findMany({
      take: 5 // Ambil 5 user pertama
    });
    
    if (users.length === 0) {
      console.log('No users found. Please seed users first.');
      return;
    }
    
    // Template assessment results
    const assessmentTemplates = [
      {
        studentStatus: 'active',
        majorStudy: 'Teknik Informatika',
        currentSemester: '6',
        currentField: 'Web Development',
        dreamJob: 'Full Stack Developer',
        interestedField: 'Frontend Development',
        mainGoal: 'Menjadi expert di React.js dan Node.js'
      },
      {
        studentStatus: 'graduate',
        majorStudy: 'Sistem Informasi',
        currentSemester: 'Lulus',
        currentField: 'Data Science',
        dreamJob: 'Data Scientist',
        interestedField: 'Machine Learning',
        mainGoal: 'Menguasai Python untuk analisis data'
      },
      {
        studentStatus: 'active',
        majorStudy: 'Desain Komunikasi Visual',
        currentSemester: '4',
        currentField: 'UI/UX Design',
        dreamJob: 'Product Designer',
        interestedField: 'User Experience',
        mainGoal: 'Membuat design yang user-friendly'
      },
      {
        studentStatus: 'active',
        majorStudy: 'Teknik Informatika',
        currentSemester: '8',
        currentField: 'Mobile Development',
        dreamJob: 'Mobile App Developer',
        interestedField: 'Flutter Development',
        mainGoal: 'Membuat aplikasi mobile cross-platform'
      },
      {
        studentStatus: 'fresh_graduate',
        majorStudy: 'Ilmu Komputer',
        currentSemester: 'Lulus',
        currentField: 'Cloud Computing',
        dreamJob: 'Cloud Engineer',
        interestedField: 'DevOps',
        mainGoal: 'Menguasai AWS dan containerization'
      }
    ];
    
    // Buat assessment untuk setiap user
    for (let i = 0; i < Math.min(users.length, assessmentTemplates.length); i++) {
      const user = users[i];
      const template = assessmentTemplates[i];
      
      try {
        // Cek apakah user sudah punya assessment
        const existingAssessment = await prisma.assessment.findFirst({
          where: { userId: user.id }
        });
        
        if (!existingAssessment) {
          await prisma.assessment.create({
            data: {
              userId: user.id,
              ...template
            }
          });
          console.log(`✅ Assessment created for user: ${user.firstName} ${user.lastName}`);
        } else {
          console.log(`⚠️ Assessment already exists for user: ${user.firstName} ${user.lastName}`);
        }
      } catch (error) {
        console.error(`❌ Error creating assessment for user ${user.id}:`, error);
      }
    }
    
    console.log('✅ Assessment results seeding completed!');
    
  } catch (error) {
    console.error('❌ Error seeding assessment results:', error);
  }
}

async function seedNotifications() {
  try {
    console.log('🔔 Seeding notifications...');
    
    // Ambil user yang sudah ada
    const users = await prisma.user.findMany({
      take: 5
    });
    
    if (users.length === 0) {
      console.log('No users found. Please seed users first.');
      return;
    }
    
    // Template notifications
    const notificationTemplates = [
      {
        title: 'Welcome to Elevate!',
        body: 'Selamat datang di platform pembelajaran Elevate. Mulai perjalanan belajar Anda sekarang!',
        type: 'welcome',
        isRead: false
      },
      {
        title: 'Course Progress Update',
        body: 'Anda telah menyelesaikan 50% dari course Flutter Development. Lanjutkan belajar!',
        type: 'progress',
        isRead: false
      },
      {
        title: 'Payment Successful',
        body: 'Pembayaran course React.js Masterclass berhasil. Selamat belajar!',
        type: 'payment',
        isRead: true
      },
      {
        title: 'New Counseling Session',
        body: 'Anda memiliki sesi konseling baru dengan Dr. Sarah. Silakan join pada waktu yang ditentukan.',
        type: 'counseling',
        isRead: false
      },
      {
        title: 'Certificate Available',
        body: 'Selamat! Sertifikat untuk course Python Data Science sudah tersedia untuk diunduh.',
        type: 'certificate',
        isRead: false
      }
    ];
    
    // Buat notification untuk setiap user
    for (const user of users) {
      for (const template of notificationTemplates) {
        try {
          await prisma.notification.create({
            data: {
              userId: user.id,
              ...template
            }
          });
        } catch (error) {
          console.error(`❌ Error creating notification for user ${user.id}:`, error);
        }
      }
      console.log(`✅ Notifications created for user: ${user.firstName} ${user.lastName}`);
    }
    
    console.log('✅ Notifications seeding completed!');
    
  } catch (error) {
    console.error('❌ Error seeding notifications:', error);
  }
}

async function seedJobs() {
  try {
    console.log('💼 Seeding job listings...');
    
    const jobData = [
      {
        title: 'Frontend Developer',
        company: 'TechStart Indonesia',
        description: 'Kami mencari Frontend Developer yang berpengalaman dengan React.js, Vue.js, dan modern CSS frameworks. Kandidat ideal memiliki pemahaman yang kuat tentang responsive design dan user experience.',
        requirements: {
          skills: ['React.js', 'Vue.js', 'JavaScript', 'HTML/CSS', 'Git'],
          experience: '2-3 years',
          education: 'Bachelor degree in Computer Science or related field'
        },
        location: 'Jakarta, Indonesia',
        salaryRange: 'Rp 8.000.000 - Rp 12.000.000',
        jobType: 'full-time',
        category: 'Web Development'
      },
      {
        title: 'Data Scientist',
        company: 'DataCorp Analytics',
        description: 'Bergabunglah dengan tim data science kami untuk menganalisis big data dan mengembangkan model machine learning yang akan membantu pengambilan keputusan bisnis.',
        requirements: {
          skills: ['Python', 'R', 'SQL', 'Machine Learning', 'TensorFlow', 'Pandas'],
          experience: '3-5 years',
          education: 'Master degree in Statistics, Mathematics, or Computer Science'
        },
        location: 'Bandung, Indonesia',
        salaryRange: 'Rp 12.000.000 - Rp 18.000.000',
        jobType: 'full-time',
        category: 'Data Science'
      },
      {
        title: 'Flutter Developer',
        company: 'MobileFirst Solutions',
        description: 'Kembangkan aplikasi mobile cross-platform menggunakan Flutter. Kami mencari developer yang passionate tentang mobile development dan user experience.',
        requirements: {
          skills: ['Flutter', 'Dart', 'Firebase', 'REST API', 'Git'],
          experience: '1-3 years',
          education: 'Bachelor degree in Computer Science or equivalent experience'
        },
        location: 'Yogyakarta, Indonesia',
        salaryRange: 'Rp 7.000.000 - Rp 11.000.000',
        jobType: 'full-time',
        category: 'Mobile Development'
      },
      {
        title: 'UI/UX Designer',
        company: 'Creative Digital Agency',
        description: 'Buat design interface yang menarik dan user experience yang optimal untuk aplikasi web dan mobile. Kolaborasi dengan developer dan product manager.',
        requirements: {
          skills: ['Figma', 'Adobe XD', 'Sketch', 'Prototyping', 'User Research'],
          experience: '2-4 years',
          education: 'Bachelor degree in Design or related field'
        },
        location: 'Surabaya, Indonesia',
        salaryRange: 'Rp 6.000.000 - Rp 10.000.000',
        jobType: 'full-time',
        category: 'UI/UX Design'
      },
      {
        title: 'Cloud Engineer',
        company: 'CloudTech Solutions',
        description: 'Kelola dan optimalisasi infrastructure cloud menggunakan AWS, Azure, atau GCP. Implementasi DevOps practices dan automation.',
        requirements: {
          skills: ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD'],
          experience: '3-5 years',
          education: 'Bachelor degree in Computer Science or related field'
        },
        location: 'Jakarta, Indonesia',
        salaryRange: 'Rp 15.000.000 - Rp 22.000.000',
        jobType: 'full-time',
        category: 'Cloud Computing'
      },
      {
        title: 'Junior Backend Developer',
        company: 'StartupHub Indonesia',
        description: 'Kesempatan untuk fresh graduate atau junior developer. Kembangkan API dan sistem backend menggunakan Node.js atau Python.',
        requirements: {
          skills: ['Node.js', 'Python', 'Express.js', 'MongoDB', 'PostgreSQL'],
          experience: '0-2 years',
          education: 'Bachelor degree in Computer Science or bootcamp graduate'
        },
        location: 'Remote',
        salaryRange: 'Rp 5.000.000 - Rp 8.000.000',
        jobType: 'full-time',
        category: 'Web Development'
      }
    ];
    
    // Buat job listings
    for (const job of jobData) {
      try {
        // Cek apakah job sudah ada
        const existingJob = await prisma.job.findFirst({
          where: { 
            title: job.title,
            company: job.company
          }
        });
        
        if (!existingJob) {
          await prisma.job.create({
            data: job
          });
          console.log(`✅ Job created: ${job.title} at ${job.company}`);
        } else {
          console.log(`⚠️ Job already exists: ${job.title} at ${job.company}`);
        }
      } catch (error) {
        console.error(`❌ Error creating job ${job.title}:`, error);
      }
    }
    
    console.log('✅ Job listings seeding completed!');
    
  } catch (error) {
    console.error('❌ Error seeding jobs:', error);
  }
}

async function main() {
  console.log('🌱 Starting additional seeds...');
  
  await seedAssessmentResults();
  await seedNotifications();
  await seedJobs();
  
  console.log('✅ All additional seeds completed!');
}

// Run if called directly
if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { 
  seedAssessmentResults, 
  seedNotifications, 
  seedJobs 
}; 