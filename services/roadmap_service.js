const prisma = require('../prisma/client');


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
  
  function mapFieldToTags(field) {
    return fieldToTags[field] || [];
  }

  async function getRecommendedRoadmaps(userId) {
    try {
      const assessment = await prisma.assessment.findFirst({ where: { userId } });
      if (!assessment) return [];
    
      const interestTags = [
        ...mapFieldToTags(assessment.interestedField),
        ...mapFieldToTags(assessment.dreamJob),
      ];
    
      const roadmaps = await prisma.roadmap.findMany({
        include: {
          roadmapCourses: {
            include: { 
              course: { 
                include: { 
                  category: true
                } 
              } 
            }
          }
        }
      });
    
      // Transformasi data roadmap untuk menghitung kecocokan
      const roadmapMatches = roadmaps.map(roadmap => {
        // Kumpulkan semua kategori kursus yang ada di roadmap
        const courseCategories = roadmap.roadmapCourses
          .filter(rc => rc.course && rc.course.category)
          .map(rc => rc.course.category.name);
        
        // Hapus duplikat kategori dengan Set
        const uniqueCategories = [...new Set(courseCategories)];
        
        // Hitung jumlah tag yang cocok dengan minat pengguna
        const matchingTags = uniqueCategories.filter(category => 
          interestTags.includes(category.toLowerCase())
        );
        
        const matchCount = matchingTags.length;
        
        return {
          ...roadmap,
          matchCount,
          matchingFields: matchingTags
        };
      });
    
      // Filter roadmap yang memiliki kecocokan dan urutkan berdasarkan jumlah kecocokan tertinggi
      return roadmapMatches
        .filter(r => r.matchCount > 0)
        .sort((a, b) => b.matchCount - a.matchCount);
    } catch (error) {
      console.error("Error in getRecommendedRoadmaps:", error);
      return [];
    }
  }
  
  async function mapAssessmentToRoadmap(userId) {
    try {
      const assessment = await prisma.assessment.findFirst({ 
        where: { userId } 
      });
      
      if (!assessment) {
        console.log(`No assessment found for user ${userId}`);
        return null;
      }
    
      const interestTags = [
        ...mapFieldToTags(assessment.interestedField),
        ...mapFieldToTags(assessment.dreamJob),
      ];
    
      // Fetch all roadmaps with their courses and categories
      const roadmaps = await prisma.roadmap.findMany({
        include: {
          roadmapCourses: {
            include: { 
              course: { 
                include: { 
                  category: true
                } 
              } 
            }
          }
        }
      });
      
      if (!roadmaps || roadmaps.length === 0) {
        console.log("No roadmaps found in the system");
        return null;
      }
    
      // Calculate matches for each roadmap
      const roadmapMatches = roadmaps.map(roadmap => {
        // Get all course categories in this roadmap
        const categories = roadmap.roadmapCourses
          .filter(rc => rc.course && rc.course.category)
          .map(rc => rc.course.category.name);
        
        // Remove duplicates
        const uniqueCategories = [...new Set(categories)];
        
        // Count matches with user interests
        const matchCount = uniqueCategories.filter(category => 
          interestTags.includes(category.toLowerCase())
        ).length;
        
        return {
          roadmapId: roadmap.id,
          matchCount
        };
      });
    
      // Sort by match count and get the best match
      const bestMatch = roadmapMatches
        .sort((a, b) => b.matchCount - a.matchCount)[0];
    
      if (!bestMatch || bestMatch.matchCount === 0) {
        console.log("No matching roadmap found for user interests");
        return null;
      }
    
      // Check if user already has this roadmap unlocked
      const existingUserRoadmap = await prisma.userRoadmap.findFirst({
        where: { 
          userId,
          roadmapId: bestMatch.roadmapId
        }
      });
    
      if (existingUserRoadmap) {
        // Only update if not already unlocked
        if (!existingUserRoadmap.isUnlocked) {
          await prisma.userRoadmap.update({
            where: { id: existingUserRoadmap.id },
            data: {
              isUnlocked: true,
              unlockedAt: new Date()
            }
          });
          console.log(`Updated existing roadmap unlock for user ${userId}, roadmap ${bestMatch.roadmapId}`);
        } else {
          console.log(`Roadmap ${bestMatch.roadmapId} already unlocked for user ${userId}`);
        }
      } else {
        // Create new user roadmap entry
        await prisma.userRoadmap.create({
          data: {
            userId,
            roadmapId: bestMatch.roadmapId,
            isUnlocked: true,
            unlockedAt: new Date()
          }
        });
        console.log(`Created new roadmap unlock for user ${userId}, roadmap ${bestMatch.roadmapId}`);
      }
    
      return bestMatch;
    } catch (error) {
      console.error("Error in mapAssessmentToRoadmap:", error);
      return null;
    }
  }

  module.exports = {
    getRecommendedRoadmaps,
    mapAssessmentToRoadmap
  };
  