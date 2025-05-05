const Prisma = require("../prisma/client");

// create assesment
exports.createAssesment = async (req, res) => {
  const {
    studentStatus,
    majorStudy,
    currentSemester,
    passionArea,
    achievementGoal,
  } = req.body;
  const userId = req.user.id;

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
    await Prisma.assessment.create({
      data: {
        userId: userId,
        studentStatus: studentStatus,
        majorStudy: majorStudy,
        currentSemester: currentSemester,
        passionArea: passionArea,
        achievementGoal: achievementGoal,
      },
    });
    return res.status(200).json({
      message: "Assesment berhasil disimpan!",
    });
  } catch (error) {
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
