const prisma = require('./client');

async function seedJobs() {
  try {
    console.log('🌱 Seeding jobs data...');

    const jobsData = [
      {
        title: "Software Engineer",
        company: "Tech Innovate",
        description: "Join our team as a Software Engineer to develop cutting-edge web applications using React, Node.js, and cloud technologies. You'll work on scalable solutions that impact millions of users.",
        requirements: {
          skills: ["JavaScript", "React", "Node.js", "MongoDB", "AWS"],
          experience: "2+ years",
          education: "Bachelor's degree in Computer Science or related field"
        },
        location: "Jakarta, Indonesia",
        salaryRange: "Rp 8,000,000 - Rp 15,000,000",
        jobType: "full-time",
        category: "Web Development",
        isActive: true
      },
      {
        title: "Frontend Developer",
        company: "Digital Solutions",
        description: "We're looking for a Frontend Developer to create beautiful, responsive user interfaces using modern technologies like React, TypeScript, and Tailwind CSS.",
        requirements: {
          skills: ["HTML", "CSS", "JavaScript", "React", "TypeScript", "Tailwind CSS"],
          experience: "1+ years",
          education: "Diploma or Bachelor's degree"
        },
        location: "Bandung, Indonesia",
        salaryRange: "Rp 6,000,000 - Rp 12,000,000",
        jobType: "full-time",
        category: "Web Development",
        isActive: true
      },
      {
        title: "Backend Developer",
        company: "CloudTech",
        description: "Join as Backend Developer to build robust APIs and microservices using Node.js, Python, and cloud technologies. Experience with databases and system architecture required.",
        requirements: {
          skills: ["Node.js", "Python", "PostgreSQL", "Docker", "Kubernetes", "AWS"],
          experience: "3+ years",
          education: "Bachelor's degree in Computer Science"
        },
        location: "Surabaya, Indonesia",
        salaryRange: "Rp 10,000,000 - Rp 18,000,000",
        jobType: "full-time",
        category: "Web Development",
        isActive: true
      },
      {
        title: "Mobile Developer (Flutter)",
        company: "AppCraft Studio",
        description: "Develop cross-platform mobile applications using Flutter and Dart. You'll work on consumer-facing apps with millions of downloads.",
        requirements: {
          skills: ["Flutter", "Dart", "Firebase", "REST APIs", "Git"],
          experience: "2+ years",
          education: "Bachelor's degree preferred"
        },
        location: "Jakarta, Indonesia",
        salaryRange: "Rp 9,000,000 - Rp 16,000,000",
        jobType: "full-time",
        category: "Mobile Development",
        isActive: true
      },
      {
        title: "iOS Developer",
        company: "Mobile Innovations",
        description: "Create premium iOS applications using Swift and SwiftUI. Join our team building next-generation mobile experiences.",
        requirements: {
          skills: ["Swift", "SwiftUI", "Xcode", "Core Data", "UIKit"],
          experience: "2+ years",
          education: "Bachelor's degree in Computer Science"
        },
        location: "Jakarta, Indonesia",
        salaryRange: "Rp 8,500,000 - Rp 16,500,000",
        jobType: "full-time",
        category: "Mobile Development",
        isActive: true
      },
      {
        title: "Data Scientist",
        company: "DataInsights Corp",
        description: "Analyze large datasets and build machine learning models to derive business insights. Experience with Python, ML libraries, and statistical analysis required.",
        requirements: {
          skills: ["Python", "Pandas", "Scikit-learn", "TensorFlow", "SQL", "Statistics"],
          experience: "2+ years",
          education: "Master's degree in Data Science, Statistics, or related field"
        },
        location: "Jakarta, Indonesia",
        salaryRange: "Rp 12,000,000 - Rp 20,000,000",
        jobType: "full-time",
        category: "Data Science",
        isActive: true
      },
      {
        title: "Machine Learning Engineer",
        company: "AI Dynamics",
        description: "Build and deploy ML models at scale. Work with deep learning frameworks and cloud ML platforms to solve complex business problems.",
        requirements: {
          skills: ["Python", "TensorFlow", "PyTorch", "MLOps", "Docker", "Kubernetes"],
          experience: "3+ years",
          education: "Bachelor's or Master's in Computer Science, AI, or related field"
        },
        location: "Bandung, Indonesia",
        salaryRange: "Rp 15,000,000 - Rp 25,000,000",
        jobType: "full-time",
        category: "Data Science",
        isActive: true
      },
      {
        title: "UI/UX Designer",
        company: "Design Studio",
        description: "Create intuitive and beautiful user experiences for web and mobile applications. Work closely with developers to implement design systems.",
        requirements: {
          skills: ["Figma", "Adobe XD", "Sketch", "Prototyping", "User Research"],
          experience: "2+ years",
          education: "Bachelor's degree in Design or related field"
        },
        location: "Jakarta, Indonesia",
        salaryRange: "Rp 7,000,000 - Rp 14,000,000",
        jobType: "full-time",
        category: "UI/UX Design",
        isActive: true
      },
      {
        title: "Product Designer",
        company: "Startup Unicorn",
        description: "Lead product design from concept to launch. Create user-centered designs that solve real problems and drive business growth.",
        requirements: {
          skills: ["Figma", "Design Thinking", "User Research", "Prototyping", "Product Strategy"],
          experience: "3+ years",
          education: "Bachelor's degree in Design, HCI, or related field"
        },
        location: "Jakarta, Indonesia",
        salaryRange: "Rp 10,000,000 - Rp 18,000,000",
        jobType: "full-time",
        category: "UI/UX Design",
        isActive: true
      },
      {
        title: "Cloud Engineer",
        company: "Cloud Solutions Inc",
        description: "Design and manage cloud infrastructure using AWS, Azure, or GCP. Implement DevOps practices and ensure system scalability and security.",
        requirements: {
          skills: ["AWS", "Docker", "Kubernetes", "Terraform", "Linux", "CI/CD"],
          experience: "2+ years",
          education: "Bachelor's degree in Computer Science or related field"
        },
        location: "Jakarta, Indonesia",
        salaryRange: "Rp 11,000,000 - Rp 19,000,000",
        jobType: "full-time",
        category: "Cloud Computing",
        isActive: true
      },
      {
        title: "DevOps Engineer",
        company: "TechScale",
        description: "Automate deployment pipelines and manage infrastructure as code. Work with containerization and orchestration technologies.",
        requirements: {
          skills: ["Docker", "Kubernetes", "Jenkins", "Ansible", "AWS", "Linux"],
          experience: "3+ years",
          education: "Bachelor's degree preferred"
        },
        location: "Surabaya, Indonesia",
        salaryRange: "Rp 12,000,000 - Rp 20,000,000",
        jobType: "full-time",
        category: "Cloud Computing",
        isActive: true
      },
      {
        title: "Cybersecurity Analyst",
        company: "SecureGuard",
        description: "Protect our systems from cyber threats. Monitor security events, conduct vulnerability assessments, and implement security measures.",
        requirements: {
          skills: ["Network Security", "Penetration Testing", "SIEM", "Incident Response", "Risk Assessment"],
          experience: "2+ years",
          education: "Bachelor's degree in Cybersecurity or related field"
        },
        location: "Jakarta, Indonesia",
        salaryRange: "Rp 10,000,000 - Rp 17,000,000",
        jobType: "full-time",
        category: "Cyber Security",
        isActive: true
      },
      {
        title: "Digital Marketing Specialist",
        company: "Marketing Pro",
        description: "Develop and execute digital marketing campaigns across multiple channels. Analyze campaign performance and optimize for better ROI.",
        requirements: {
          skills: ["Google Ads", "Facebook Ads", "SEO", "Analytics", "Content Marketing"],
          experience: "2+ years",
          education: "Bachelor's degree in Marketing or related field"
        },
        location: "Jakarta, Indonesia",
        salaryRange: "Rp 6,000,000 - Rp 12,000,000",
        jobType: "full-time",
        category: "Digital Marketing",
        isActive: true
      },
      {
        title: "Game Developer",
        company: "GameStudio",
        description: "Create engaging mobile and PC games using Unity or Unreal Engine. Work on gameplay mechanics, graphics optimization, and player experience.",
        requirements: {
          skills: ["Unity", "C#", "Game Design", "3D Modeling", "Animation"],
          experience: "2+ years",
          education: "Bachelor's degree in Game Development or related field"
        },
        location: "Bandung, Indonesia",
        salaryRange: "Rp 8,000,000 - Rp 15,000,000",
        jobType: "full-time",
        category: "Game Development",
        isActive: true
      },
      {
        title: "Junior Software Engineer",
        company: "StartupTech",
        description: "Entry-level position for fresh graduates. Learn and grow while building web applications using modern technologies.",
        requirements: {
          skills: ["JavaScript", "HTML", "CSS", "Basic Programming", "Git"],
          experience: "0-1 years",
          education: "Bachelor's degree in Computer Science or related field"
        },
        location: "Jakarta, Indonesia",
        salaryRange: "Rp 5,000,000 - Rp 8,000,000",
        jobType: "full-time",
        category: "Web Development",
        isActive: true
      }
    ];

    // Create jobs one by one to handle duplicates
    for (const jobData of jobsData) {
      try {
        // Check if job already exists
        const existingJob = await prisma.job.findFirst({
          where: {
            title: jobData.title,
            company: jobData.company
          }
        });

        if (!existingJob) {
          await prisma.job.create({
            data: jobData
          });
          console.log(`✅ Created job: ${jobData.title} at ${jobData.company}`);
        } else {
          console.log(`⏭️  Job already exists: ${jobData.title} at ${jobData.company}`);
        }
      } catch (error) {
        console.error(`❌ Error creating job ${jobData.title}:`, error.message);
      }
    }

    console.log('✅ Jobs seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding jobs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedJobs();
}

module.exports = { seedJobs }; 