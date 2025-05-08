const prisma = require("../prisma/client");
const storageService = require("../utils/storage");
const path = require("path");

// GET /api/courses
exports.getCourses = async (req, res) => {
  const { categoryId, search, page = 1, limit = 10 } = req.query;
  const take = Number(limit);
  const skip = (Number(page) - 1) * take;

  try {
    const whereClause = {};

    if (categoryId) {
      whereClause.categoryId = Number(categoryId);
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }
    const courses = await prisma.course.findMany({
      where: whereClause,

      include: { category: true },
      skip: skip,
      take: take,
      orderBy: { createdAt: "desc" }, // sort dari yang paling baru
    });

    const totalCourses = await prisma.course.count({
      where: whereClause,
    });

    return res.status(200).json({
      courses,
      pagination: {
        total: totalCourses,
        page: Number(page),
        limit: take,
        totalPages: Math.ceil(totalCourses / take),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

// GET /api/courses/:id
exports.getCourseById = async (req, res) => {
  const { id } = req.params;
  try {
    const course = await prisma.course.findUnique({
      where: { id: Number(id) },
      include: { category: true },
    });

    if (!course) {
      return res.status(404).json({ message: "Course tidak ditemukan" });
    }

    return res.status(200).json({ course });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

// POST /api/courses/:id/enroll
exports.enrollCourse = async (req, res) => {
  const userId = req.user.id;
  const { courseId } = req.body;
  try {
    const course = await prisma.course.findMany({
      where: { id: Number(courseId) },
    });
    if (!course) {
      return res.status(404).json({ message: "Course tidak ditemukan" });
    }

    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        userId: userId,
        courseId: Number(courseId),
      },
    });
    if (existingEnrollment) {
      return res
        .status(400)
        .json({ message: "Anda sudah terdaftar di course ini" });
    }

    if (course.isPaid) {
      return res.status(402).json({
        message:
          "Course ini berbayar. Silakan lakukan pembayaran terlebih dahulu.",
      });
    }

    await prisma.enrollment.create({
      data: {
        userId: userId,
        courseId: Number(courseId),
        isPaid: false,
      },
    });

    return res.status(201).json({
      message: "Berhasil mendaftar course",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

// GET /api/course/me
exports.GetMyCourses = async (req, res) => {
  const userId = req.user.id;
  try {
    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId: userId,
      },
      include: {
        course: {
          include: { category: true },
        },
      },
    });

    const myCourses = enrollments.map((enrollment) => ({
      id: enrollment.course.id,
      title: enrollment.course.title,
      description: enrollment.course.description,
      category: enrollment.course.category.name,
      thumbnail: enrollment.course.thumbnail,
      enrolledAt: enrollment.enrolledAt,
    }));
    return res.status(200).json({ courses: myCourses });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};
exports.updateLessonProgress = async (req, res) => {
  const { lessonId } = req.params;
  const userId = req.user.id;
  const { isCompleted } = req.body;

  try {
    // Cek apakah lesson ada
    const lesson = await prisma.lesson.findUnique({
      where: { id: Number(lessonId) },
    });
    if (!lesson) {
      return res.status(404).json({ message: "Lesson tidak ditemukan" });
    }

    // Upsert progress (update jika ada, buat kalau belum)
    const progress = await prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId: userId,
          lessonId: Number(lessonId),
        },
      },
      update: {
        isCompleted,
      },
      create: {
        userId,
        lessonId: Number(lessonId),
        isCompleted,
      },
    });

    return res.json({ message: "Progress berhasil disimpan", progress });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Gagal menyimpan progress", error: err.message });
  }
};

exports.getCourseProgress = async (req, res) => {
  const { courseId } = req.params;
  const userId = req.user.id;

  try {
    const course = await prisma.course.findUnique({
      where: { id: Number(courseId) },
      include: {
        lesson: true,
        quizzes: true,
      },
    });

    if (!course) {
      return res.status(404).json({ message: "Course tidak ditemukan" });
    }

    const totalLessons = course.lesson.length;
    const totalQuizzes = course.quizzes.length;

    const completedLessons = await prisma.lessonProgress.count({
      where: {
        userId,
        lesson: { courseId: Number(courseId) },
        isCompleted: true,
      },
    });

    const courseProgress = await prisma.courseProgress.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: Number(courseId),
        },
      },
    });

    const completedQuizzes = courseProgress?.completedQuizzes || 0;
    const isCompleted =
      completedLessons >= totalLessons && completedQuizzes >= totalQuizzes;
    //update iscompleted = true jika completedLessons >= totalLessons && completedQuizzes >= totalQuizzes

    if (isCompleted && courseProgress && !courseProgress.isCompleted) {
      await prisma.courseProgress.update({
        where: {
          userId_courseId: {
            userId,
            courseId: Number(courseId),
          },
        },
        data: {
          isCompleted: true,
        },
      });
    }
    return res.json({
      courseId: Number(courseId),
      userId,
      totalLessons,
      completedLessons,
      totalQuizzes,
      completedQuizzes,
      isCompleted,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

exports.getcourseVideos = async (req, res) => {
  const { courseId } = req.params;

  try {
    const course = await prisma.course.findUnique({
      where: { id: Number(courseId) },
      include: {
        lesson: true,
      },
    });

    if (!course) {
      return res.status(404).json({ message: "Course tidak ditemukan" });
    }

    return res.status(200).json({ videos: course.videos });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

// POST /api/courses/:courseId/videos
exports.addCourseVideo = async (req, res) => {
  const { id } = req.params;
  const { title, isLocked } = req.body;

  try {
    // Pastikan ada data video
    if (!title) {
      return res.status(400).json({ message: "Title video diperlukan!" });
    }

    // Pastikan course ada
    const course = await prisma.course.findUnique({
      where: { id: Number(id) }
    });

    if (!course) {
      return res.status(404).json({ message: "Course tidak ditemukan" });
    }

    // Pastikan user yang mengupload adalah creator course
    if (course.createdById !== req.user.id) {
      return res.status(403).json({ message: "Anda tidak memiliki akses untuk mengupload video ke course ini" });
    }

    let videoUrl = null;
    let s3Key = null;

    // Upload file ke storage jika ada
    if (req.file) {
      try {
        // Upload ke B2
        const cleanFileName = path.basename(req.file.originalname, path.extname(req.file.originalname));
        const uploadResult = await storageService.uploadFile(
          req.file.path,
          storageService.FileCategory.COURSE_VIDEO,
          `${course.id}-${cleanFileName}`
        );

        videoUrl = uploadResult.fileUrl;
        s3Key = uploadResult.fileName;
      } catch (uploadError) {
        console.error("Error uploading to B2:", uploadError);
        return res.status(500).json({ message: "Gagal mengupload video ke storage" });
      }
    } else {
      return res.status(400).json({ message: "File video diperlukan!" });
    }

    // Hitung order baru (urutan terakhir + 1)
    const lastVideo = await prisma.coursevideo.findFirst({
      where: { courseId: Number(id) },
      orderBy: { order: 'desc' }
    });
    
    const newOrder = lastVideo ? lastVideo.order + 1 : 1;

    // Tambahkan video baru ke dalam kursus
    const newVideo = await prisma.coursevideo.create({
      data: {
        title,
        videoUrl,
        isLocked: isLocked === "true" || isLocked === true,
        courseId: Number(id),
        order: newOrder,
        s3Key
      },
    });

    return res
      .status(201)
      .json({ message: "Video berhasil ditambahkan", video: newVideo });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

// GET /api/courses/:courseId/quizzes
exports.getQuizzezForCourse = async (req, res) => {
  const { courseId } = req.params;

  try {
    //mengambil semua quiz untuk kursus tertentu
    const quizzes = await prisma.quiz.findMany({
      where: {
        courseId: Number(courseId),
      },
    });
    if (quizzes.length === 0) {
      return res
        .status(404)
        .json({ message: "Tidak ada quiz untuk kursus ini" });
    }

    return res.status(200).json({ quizzes });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

// POST /api/courses/:courseId/quizzes/:quizId/submit
exports.submitQuizAnswer = async (req, res) => {
  const { courseId, quizId } = req.params;
  const { answers } = req.body; // Jawaban dari user

  try {
    // Menyimpan jawaban user untuk quiz ini
    const quiz = await prisma.quiz.findUnique({
      where: { id: Number(quizId) },
    });

    if (!quiz) {
      return res.status(404).json({ message: "Quiz tidak ditemukan" });
    }

    // Memeriksa jawaban yang benar
    const correctAnswers = quiz.correctAnswer.split(","); // Misalnya jawaban benar disimpan sebagai string yang dipisah dengan koma

    let score = 0;
    // Bandingkan jawaban user dengan jawaban yang benar
    answers.forEach((answer, index) => {
      if (correctAnswers[index] === answer) {
        score++;
      }
    });

    // Simpan hasil quiz ke database atau update progress
    const result = await prisma.quizSubmission.create({
      data: {
        userId: req.user.id,
        courseId: Number(courseId),
        quizId: Number(quizId),
        score,
        totalQuestions: answers.length,
        isPassed: score >= Math.ceil(answers.length / 2), // Anggap lulus jika benar lebih dari setengah
      },
    });

    return res.status(200).json({
      message: "Quiz berhasil disubmit",
      score,
      totalQuestions: answers.length,
      isPassed: result.isPassed,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

// GET /api/courses/:courseId/quizzes/:quizId/results
exports.getQuizResult = async (req, res) => {
  const { courseId, quizId } = req.params;
  const userId = req.user.id;

  try {
    const quizResult = await prisma.quizSubmission.findFirst({
      where: {
        userId,
        quizId: Number(quizId),
        courseId: Number(courseId),
      },
    });
    if (!quizResult) {
      return res.status(404).json({ message: "Hasil quiz tidak ditemukan" });
    }
    return res.status(200).json({
      message: "Hasil quiz ditemukan",
      score: quizResult.score,
      totalQuestions: quizResult.totalQuestions,
      isPassed: quizResult.isPassed,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

exports.getCourseVideos = async (req, res) => {
  const { courseId } = req.params;

  try {
    const courseVideos = await prisma.courseVideo.findMany({
      where: {
        courseId: Number(courseId),
      },
    });

    if (!courseVideos.length) {
      return res
        .status(404)
        .json({ message: "Tidak ada video untuk kursus ini" });
    }

    return res.status(200).json({ courseVideos });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

exports.getCourseQuizzes = async (req, res) => {
  const { courseId } = req.params;

  try {
    const quizzes = await prisma.quiz.findMany({
      where: {
        courseId: Number(courseId),
      },
    });

    if (!quizzes.length) {
      return res
        .status(404)
        .json({ message: "Tidak ada quiz untuk kursus ini" });
    }
    return res.status(200).json({ quizzes });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

exports.bookmarkCourse = async (req, res) => {
  const { courseId } = req.params;
  const userId = req.user.id;

  try {
    // Cek apakah bookmark sudah ada
    const existingBookmark = await prisma.bookmarkCourse.findFirst({
      where: {
        userId,
        courseId: Number(courseId),
      },
    });
    
    if (existingBookmark) {
      // Hapus bookmark jika sudah ada (toggle)
      await prisma.bookmarkCourse.delete({
        where: { id: existingBookmark.id },
      });
      
      return res.status(200).json({
        message: "Bookmark berhasil dihapus",
        isBookmarked: false
      });
    } else {
      // Buat bookmark baru jika belum ada
      await prisma.bookmarkCourse.create({
        data: {
          userId,
          courseId: Number(courseId),
        },
      });
      
      return res.status(201).json({
        message: "Course berhasil di-bookmark",
        isBookmarked: true
      });
    }
  } catch (e) {
    console.error("Error bookmarking course:", e);
    return res.status(500).json({message: "Terjadi kesalahan server"});
  }
}

// GET /api/courses/bookmarks
exports.getBookmarkedCourses = async (req, res) => {
  const userId = req.user.id;

  try {
    // Gunakan model bookmarkCourse untuk mendapatkan course yang sudah di-bookmark
    const bookmarks = await prisma.bookmarkCourse.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            category: true
          }
        }
      }
    });
    
    if (!bookmarks || bookmarks.length === 0) {
      return res.status(200).json({
        message: "Belum ada course yang di-bookmark",
        courses: []
      });
    }
    
    // Transform response untuk struktur yang lebih clean
    const courses = bookmarks.map(bookmark => bookmark.course);

    return res.status(200).json({
      message: "Berhasil mengambil daftar course yang di-bookmark",
      count: courses.length,
      courses
    });
  } catch (e) {
    console.error("Error getting bookmarked courses:", e);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
}

// GET /api/courses/:courseId/is-bookmarked
exports.isBookmarked = async (req, res) => {
  const { courseId } = req.params;
  const userId = req.user.id;

  try {
    const bookmark = await prisma.bookmarkCourse.findFirst({
      where: { 
        userId,
        courseId: Number(courseId)
      }
    });
    
    return res.status(200).json({
      isBookmarked: !!bookmark
    });
  } catch (e) {
    console.error("Error checking bookmark status:", e);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
}

