const Prisma = require("../prisma/client");
const { mapAssessmentToRoadmap } = require("../services/roadmap_service");
// create assesment
exports.createAssessment = async (req, res) => {
  if (!req.body) {
    return res.status(400).json({ message: "Data tidak ditemukan" });
  }
  const {
    studentStatus,
    majorStudy,
    currentSemester,
    currentField,
    interestedField,
    dreamJob,
    mainGoal,
  } = req.body;

  const userId = req.user.id;
 
  if (
    !studentStatus ||
    !majorStudy ||
    !currentSemester ||
    !currentField ||
    !interestedField ||
    !dreamJob ||
    !mainGoal
  ) {
    return res.status(400).json({ message: "Semua field harus diisi" });
  }
  try {
    //cek apakah user sudah isi assesment
    const existingAssesment = await Prisma.assessment.findFirst({
      where: {
        userId: userId,
      },
    });

    if (existingAssesment) {
      return res.status(400).json({
        message: "User sudah melakukan assesment!",
      });
    }

    //simpan assesment ke db
 const createdAssessment=   await Prisma.assessment.create({
      data: {
       userId: userId,
        studentStatus: studentStatus,
        majorStudy: majorStudy,
        currentSemester: currentSemester,
        currentField: currentField,
        interestedField: interestedField,
        dreamJob: dreamJob,
        mainGoal: mainGoal,
      },
    });

    await mapAssessmentToRoadmap(userId);
    return res.status(201).json({
      message: "Assesment berhasil disimpan!",
      data: createdAssessment,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Terjadi kesalahan server",
      error: {
        message: error.message,
      },
    });
  }
};

//check if user has assesment
exports.checkAssesment = async (req, res) => {
  const userId = req.user.id;

  try {
    const assesment = await Prisma.assessment.findFirst({
      where: {
        userId: userId,
      },
    });

    return res.status(200).json({
      message: "Assesment berhasil diambil!",
      hasAssesment: !!assesment,
      data: assesment || null,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Terjadi kesalahan server",
      error: {
        message: error.message,
      },
    });
  }
};
