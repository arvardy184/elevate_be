const prisma = require("../prisma/client");
const { getRecommendedRoadmaps, mapAssessmentToRoadmap } = require("../services/roadmap_service");

const fieldToTags = {
  "Web Development": ["html", "css", "javascript", "react", "nodejs", "express", "mongodb", "mysql", "postgresql", "docker", "kubernetes", "aws", "azure", "google cloud", "devops", "cicd", "jenkins", "gitlab", "github", "gitlab ci", "github actions"],
  "Mobile Development": ["flutter", "react native", "kotlin", "java", "swift", "objective-c", "android", "ios", "react native", "flutter", "kotlin", "java", "swift", "objective-c", "android", "ios"],
  "Data Science": ["python", "r", "sql", "machine learning", "deep learning", "tensorflow", "pytorch", "pandas", "numpy", "scikit-learn", "data visualization", "tableau", "power bi", "statistics", "big data", "hadoop", "spark", "data mining", "data analysis", "data engineering"],
  "UI/UX Design": ["figma", "sketch", "adobe xd", "invision", "principle", "protopie", "zeplin", "abstract", "user research", "wireframing", "prototyping", "user testing", "usability testing", "information architecture", "interaction design", "visual design", "user interface", "user experience"],
  "Game Development": ["unity", "unreal engine", "godot", "c#", "c++", "lua", "game design", "3d modeling", "animation", "level design", "game art", "game audio", "game testing", "game programming", "game physics", "game ai", "game networking", "game optimization"],
  "Cyber Security": ["network security", "web security", "cryptography", "ethical hacking", "penetration testing", "malware analysis", "incident response", "forensics", "security tools", "security frameworks", "security compliance", "security audit", "security assessment", "security monitoring", "security operations"],
  "Cloud Computing": ["aws", "azure", "google cloud", "cloud architecture", "cloud security", "cloud storage", "cloud networking", "cloud databases", "cloud computing", "cloud deployment", "cloud migration", "cloud optimization", "cloud monitoring", "cloud automation", "cloud cost management"],
  "Digital Marketing": ["seo", "sem", "social media marketing", "content marketing", "email marketing", "analytics", "ppc", "affiliate marketing", "brand marketing", "marketing automation", "marketing strategy", "marketing analytics", "marketing tools", "marketing campaigns", "marketing optimization"]
};

const mapFieldToTags = (field) => {
  return fieldToTags[field] || [];
};

exports.recommendRoadmaps = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Cek apakah user memiliki assessment
    const assessment = await prisma.assessment.findFirst({
      where: { userId }
    });
    
    if (!assessment) {
      return res.status(404).json({ message: "Assessment tidak ditemukan" });
    }

    // Gunakan service untuk mendapatkan roadmap rekomendasi
    const recommendedRoadmaps = await getRecommendedRoadmaps(userId);
    
    if (!recommendedRoadmaps || recommendedRoadmaps.length === 0) {
      return res.status(200).json({
        message: "Tidak ada roadmap yang cocok dengan minat Anda",
        roadmaps: []
      });
    }

    // Unlock roadmap terbaik secara otomatis jika belum di-unlock
    const bestMatch = recommendedRoadmaps[0];
    const existingUserRoadmap = await prisma.userRoadmap.findFirst({
      where: { userId, roadmapId: bestMatch.id }
    });

    if (!existingUserRoadmap) {
      await prisma.userRoadmap.create({
        data: {
          userId,
          roadmapId: bestMatch.id,
          isUnlocked: true,
          unlockedAt: new Date()
        }
      });
    } else if (!existingUserRoadmap.isUnlocked) {
      await prisma.userRoadmap.update({
        where: { id: existingUserRoadmap.id },
        data: { isUnlocked: true, unlockedAt: new Date() }
      });
    }

    return res.status(200).json({
      message: "Roadmap rekomendasi berhasil diambil",
      roadmaps: recommendedRoadmaps,
    });
    
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
}

exports.getRoadmaps = async (req, res) => {
  try {
    const roadmap = await prisma.roadmap.findMany({
      include: {
        roadmapCourses: {
          include: { course: true },
        },
      },
    });
    return res.status(200).json({ roadmap });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      message: "Terjadi kesalahan server",
    });
  }
};

//getUserRoadmaps
exports.getUserRoadmaps = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Ambil semua roadmap yang telah di-unlock oleh user
    const userRoadmaps = await prisma.userRoadmap.findMany({
      where: { userId },
      include: {
        roadmap: {
          include: {
            roadmapCourses: { 
              include: { 
                course: true 
              } 
            },
          },
        },
      },
    });

    // Ambil progress user untuk setiap course
    const userRoadmapsWithProgress = await Promise.all(
      userRoadmaps.map(async (userRoadmap) => {
        // Ambil semua course ID dari roadmap
        const courseIds = userRoadmap.roadmap.roadmapCourses.map(rc => rc.courseId);
        
        // Cari progress user untuk course-course tersebut
        const userCourses = await prisma.userCourse.findMany({
          where: {
            userId,
            courseId: { in: courseIds }
          }
        });
        
        // Hitung total progress
        const totalCourses = courseIds.length;
        const completedCourses = userCourses.filter(uc => uc.isCompleted).length;
        
        // Hitung persentase progress (0-100)
        const progressPercentage = totalCourses > 0 
          ? Math.round((completedCourses / totalCourses) * 100) 
          : 0;
        
        return {
          ...userRoadmap,
          progressPercentage,
          completedCourses,
          totalCourses
        };
      })
    );

    res.status(200).json({ 
      message: "Roadmap user berhasil diambil",
      userRoadmaps: userRoadmapsWithProgress 
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

exports.getRoadmapById = async (req, res) => {
    try{
        const id = Number(req.params.id);
        const roadmap = await prisma.roadmap.findUnique({
            where: {id},
            include: {
                roadmapCourses: {
                    orderBy: { order: 'asc'},
                    include: {
                        course: true
                    },
                }
            }
        });
        if(!roadmap){
            return res.status(404).json({message: "Roadmap tidak ditemukan"});
        }
        return res.status(200).json({roadmap});
    } catch(e){
        console.error(e);
        return res.status(500).json({message: "Terjadi kesalahan server"});
    }
};

exports.unlockRoadmap = async (req, res)=> {
    try{
        const userId = req.user.id;
        const roadmapId = Number(req.params.id);

        const roadmap = await prisma.roadmap.findUnique({ where: { id: roadmapId } });
        if(!roadmap){
            return res.status(404).json({message: "Roadmap tidak ditemukan"});
        }

    const existing = await prisma.userRoadmap.findFirst({
        where: {userId, roadmapId}
    });
    if(existing && existing.isUnlocked){
        return res.status(400).json({message: "Roadmap sudah terbuka"});
    }

        // Buat atau update unlock
        const userRoadmap = existing
        ? await prisma.userRoadmap.update({
            where: { id: existing.id },
            data: { isUnlocked: true, unlockedAt: new Date() }
          })
        : await prisma.userRoadmap.create({
            data: { userId, roadmapId, isUnlocked: true, unlockedAt: new Date() }
          });
  
          res.status(200).json({
            message: 'Roadmap berhasil dibuka!',
            userRoadmap
          });

    } catch(e){
        console.error(e);
        return res.status(500).json({message: "Terjadi kesalahan server"});
    }
}