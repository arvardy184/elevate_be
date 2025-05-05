const prisma = require("../prisma/client");

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
    const userRoadmaps = await prisma.roadmap.findMany({
      where: { userId },
      include: {
        roadmap: {
          include: {
            roadmapCourses: { include: { course: true } },
          },
        },
      },
    });

    res.status(200).json({ userRoadmaps });
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

        const roadmap = await prisma.roadmap.findUnique({
            where: {userId, roadmapId}
        });
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