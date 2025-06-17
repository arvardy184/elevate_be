const prisma = require('../prisma/client');
const storageService = require("../utils/storage");
const path = require("path");
const PDFDocument = require("pdfkit");
const moment = require("moment");
const fs = require("fs");
const https = require('https');
const http = require('http');

/**
 * @swagger
 * components:
 *   schemas:
 *     Course:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID unik course
 *         title:
 *           type: string
 *           description: Judul course
 *         description:
 *           type: string
 *           description: Deskripsi course
 *         thumbnail:
 *           type: string
 *           description: URL thumbnail course
 *         price:
 *           type: number
 *           description: Harga course (0 untuk course gratis)
 *         isPaid:
 *           type: boolean
 *           description: Status apakah course berbayar
 *         isActive:
 *           type: boolean
 *           description: Status apakah course aktif
 *         category:
 *           $ref: '#/components/schemas/Category'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     Category:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         description:
 *           type: string
 *     CourseProgress:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *         courseId:
 *           type: integer
 *         progress:
 *           type: number
 *           description: Persentase progress (0-100)
 *         isCompleted:
 *           type: boolean
 *         lastAccessedAt:
 *           type: string
 *           format: date-time
 *     LessonProgress:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *         lessonId:
 *           type: integer
 *         isCompleted:
 *           type: boolean
 *         lastAccessedAt:
 *           type: string
 *           format: date-time
 *     Enrollment:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *         courseId:
 *           type: integer
 *         isPaid:
 *           type: boolean
 *         enrolledAt:
 *           type: string
 *           format: date-time
 */

// GET /api/courses
/**
 * @swagger
 * /api/courses:
 *   get:
 *     summary: Ambil daftar course dengan filter dan pagination
 *     tags: [Courses]
 *     parameters:
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *         description: Filter berdasarkan kategori
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Pencarian berdasarkan judul atau deskripsi
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Halaman yang ingin diakses
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Jumlah item per halaman
 *     responses:
 *       200:
 *         description: Daftar course berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 courses:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Course'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       500:
 *         description: Server error
 */
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
        { title: { contains: search } },
        { description: { contains: search } },
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
/**
 * @swagger
 * /api/courses/{id}:
 *   get:
 *     summary: Ambil detail course berdasarkan ID
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID course
 *     responses:
 *       200:
 *         description: Detail course berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 course:
 *                   $ref: '#/components/schemas/Course'
 *       404:
 *         description: Course tidak ditemukan
 *       500:
 *         description: Server error
 */
exports.getCourseById = async (req, res) => {
  const { id } = req.params;
  try {
    const [course, reviewStats] = await Promise.all([
      prisma.course.findUnique({
        where: { id: Number(id) },
        include: { category: true }
      }),
      prisma.courseReview.aggregate({
        where: { courseId: Number(id) },
        _avg: { rating: true },
        _count: { rating: true }
      })
    ]);

    if (!course) {
      return res.status(404).json({ message: "Course tidak ditemukan" });
    }

    // Tambah rating stats ke response
    const courseWithRating = {
      ...course,
      averageRating: reviewStats._avg.rating ? Math.round(reviewStats._avg.rating * 10) / 10 : 0,
      totalReviews: reviewStats._count.rating
    };

    return res.status(200).json({ course: courseWithRating });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

// POST /api/courses/:id/enroll
/**
 * @swagger
 * /api/courses/{id}/enroll:
 *   post:
 *     summary: Mendaftar ke course
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID course
 *     responses:
 *       201:
 *         description: Berhasil mendaftar course
 *       400:
 *         description: Sudah terdaftar di course ini
 *       402:
 *         description: Course berbayar, perlu pembayaran
 *       404:
 *         description: Course tidak ditemukan
 *       500:
 *         description: Server error
 */
exports.enrollCourse = async (req, res) => {
  const userId = req.user.id;
  const courseId = Number(req.params.id);
  try {
    const course = await prisma.course.findUnique({
      where: {
        id: courseId,
        // isActive: true
      },
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
/**
 * @swagger
 * /api/courses/me:
 *   get:
 *     summary: Ambil daftar course yang diikuti user
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daftar course berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 courses:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       category:
 *                         type: string
 *                       thumbnail:
 *                         type: string
 *                       enrolledAt:
 *                         type: string
 *                         format: date-time
 *       500:
 *         description: Server error
 */
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

// POST /api/courses/:courseId/lessons/:lessonId/progress
/**
 * @swagger
 * /api/courses/{courseId}/lessons/{lessonId}/progress:
 *   post:
 *     summary: Update progress lesson
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isCompleted
 *             properties:
 *               isCompleted:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Progress berhasil disimpan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 progress:
 *                   $ref: '#/components/schemas/LessonProgress'
 *       404:
 *         description: Lesson tidak ditemukan
 *       500:
 *         description: Server error
 */
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

// GET /api/courses/:courseId/progress
/**
 * @swagger
 * /api/courses/{courseId}/progress:
 *   get:
 *     summary: Ambil progress course user
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Progress course berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalLessons:
 *                   type: integer
 *                 totalQuizzes:
 *                   type: integer
 *                 completedLessons:
 *                   type: integer
 *                 progress:
 *                   $ref: '#/components/schemas/CourseProgress'
 *       403:
 *         description: Belum terdaftar di course ini
 *       404:
 *         description: Course tidak ditemukan
 *       500:
 *         description: Server error
 */
exports.getCourseProgress = async (req, res) => {
  const courseId = Number(req.params.id);
  const userId = req.user.id;

  try {
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId,
        courseId: Number(courseId),
      },
    });

    if (!enrollment) {
      return res
        .status(403)
        .json({ message: "Anda belum terdaftar di course ini" });
    }

    const [course, progress] = await Promise.all([
      prisma.course.findUnique({
        where: { id: Number(courseId) },
        include: {
          lesson: true,
          quizzes: {
            where: { isRequired: true },
          },
        },
      }),
      prisma.courseProgress.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId: Number(courseId),
          },
        },
      }),
    ]);

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

// POST /api/courses/:courseId/videos
exports.addCourseVideo = async (req, res) => {
  console.log("[addCourseVideo] masuk controller");
  const courseId = Number(req.params.courseId);
  const userId = req.user.id;
  const { title, isLocked } = req.body;
  console.log("--- [addCourseVideo] Mulai upload video ---");
  console.log("courseId:", courseId);
  console.log("userId:", userId);
  console.log("req.body:", req.body);
  try {
    // Cek course ada atau tidak dulu
    const course = await prisma.course.findUnique({
      where: { id: Number(courseId) }
    });
    console.log("[addCourseVideo] course:", course);

    if (!course) {
      console.error("[addCourseVideo] Course tidak ditemukan");
      return res.status(404).json({
        message: "Course tidak ditemukan"
      });
    }

    // Cek authorization - hanya creator course atau admin yang bisa upload
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    const isCreator = course.createdById === userId;
    const isAdmin = user?.role === 'ADMIN';

    if (!isCreator && !isAdmin) {
      console.error("[addCourseVideo] User bukan creator course atau admin");
      console.log("[addCourseVideo] Course createdById:", course.createdById);
      console.log("[addCourseVideo] User ID:", userId);
      console.log("[addCourseVideo] User role:", user?.role);
      return res.status(403).json({
        message: "Hanya creator course atau admin yang dapat mengupload video"
      });
    }

    console.log("[addCourseVideo] req.file:", req.file);
    if (
      !req.file ||
      !["video/mp4", "video/mov", "video/avi", "video/mkv"].includes(
        req.file.mimetype
      )
    ) {
      console.error("[addCourseVideo] File tidak valid atau tidak ada");
      return res
        .status(400)
        .json({ message: "File video harus berupa MP4, MOV, AVI, atau MKV" });
    }

    let videoUrl = null;
    let s3Key = null;

    // Upload file ke storage jika ada
    if (req.file) {
      try {
        console.log("[addCourseVideo] Mulai upload ke B2...");
        // Upload ke B2
        const cleanFileName = path.basename(
          req.file.originalname,
          path.extname(req.file.originalname)
        );
        console.log("[addCourseVideo] Memulai upload ke B2...");
        const uploadResult = await storageService.uploadFile(
          req.file.path,
          storageService.FileCategory.COURSE_VIDEO,
          `${course.id}-${cleanFileName}`
        );
        console.log("[addCourseVideo] Upload ke B2 berhasil");
        videoUrl = uploadResult.fileUrl;
        s3Key = uploadResult.fileName;
      } catch (uploadError) {
        console.error("[addCourseVideo] Error uploading to B2:", uploadError);
        return res
          .status(500)
          .json({ message: "Gagal mengupload video ke storage" });
      }
    } else {
      console.error("[addCourseVideo] File video diperlukan!");
      return res.status(400).json({ message: "File video diperlukan!" });
    }

    // Hitung order baru (urutan terakhir + 1)
    const lastVideo = await prisma.coursevideo.findFirst({
      where: { courseId: Number(courseId) },
      orderBy: { order: "desc" },
    });
    console.log("[addCourseVideo] lastVideo:", lastVideo);
    const newOrder = lastVideo ? lastVideo.order + 1 : 1;

    // Tambahkan video baru ke dalam kursus
    const newVideo = await prisma.coursevideo.create({
      data: {
        title,
        videoUrl,
        isLocked: isLocked === "true" || isLocked === true,
        courseId: Number(courseId),
        order: newOrder,
        s3Key,
      },
    });
    console.log("[addCourseVideo] newVideo:", newVideo);

    // Generate proxy URL untuk response (secure access)
    const proxyUrl = `${req.protocol}://${req.get('host')}/api/courses/videos/proxy/${newVideo.id}`;
    
    const videoResponse = {
      ...newVideo,
      videoUrl: proxyUrl, // Replace dengan proxy URL
      originalUrl: newVideo.videoUrl, // Keep original untuk reference
      isProxied: true
    };

    return res
      .status(201)
      .json({ 
        message: "Video berhasil ditambahkan", 
        video: videoResponse,
        note: "Video accessible via secure proxy URL"
      });
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
  const userId = req.user.id;
  const { answers } = req.body; // Jawaban dari user

  try {
    const [enrollment, quiz, existingSubmission] = await Promise.all([
      prisma.enrollment.findFirst({
        where: {
          userId,
          courseId: Number(courseId),
        },
      }),
      prisma.quiz.findUnique({
        where: {
          id: Number(quizId),
        },
      }),
      prisma.quizSubmission.findFirst({
        where: {
          userId,
          quizId: Number(quizId),
        },
      }),
    ]);
    if (!enrollment) {
      return res
        .status(403)
        .json({ message: "Anda belum terdaftar di course ini" });
    }

    if (!quiz) {
      return res.status(404).json({ message: "Quiz tidak ditemukan" });
    }

    if (existingSubmission) {
      return res
        .status(400)
        .json({ message: "Anda sudah mengirim jawaban untuk quiz ini" });
    }

    const correctAnswers = quiz.correctAnswer?.split(",") || [];
    let score = 0;

    answers.forEach((answer, index) => {
      if (index < correctAnswers.length && correctAnswers[index] === answer) {
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

// GET /api/courses/:courseId/videos
exports.getCourseVideos = async (req, res) => {
  console.log("[getCourseVideos] masuk controller");
  const { courseId } = req.params;

  try {
    const courseVideos = await prisma.coursevideo.findMany({
      where: {
        courseId: Number(courseId),
      },
      orderBy: { order: 'asc' }
    });

    if (!courseVideos.length) {
      return res
        .status(404)
        .json({ message: "Tidak ada video untuk kursus ini" });
    }

    // Generate proxy URLs untuk semua video (private bucket access via backend)
    console.log("[getCourseVideos] Generating proxy URLs for private bucket access");
    
    const videosWithProxyUrls = courseVideos.map((video) => {
      // Generate proxy URL yang akan di-handle sama backend
      const proxyUrl = `${req.protocol}://${req.get('host')}/api/courses/videos/proxy/${video.id}`;
      
      return {
        ...video,
        videoUrl: proxyUrl, // Replace dengan proxy URL
        originalUrl: video.videoUrl, // Keep original untuk reference
        isProxied: true
      };
    });
    
    return res.status(200).json({ 
      courseVideos: videosWithProxyUrls,
      note: "Videos accessible via proxy URLs (secure private bucket access)"
    });

  } catch (error) {
    console.error("[getCourseVideos] Error:", error);
    return res.status(500).json({ 
      message: "Error mengambil video kursus", 
      error: error.message 
    });
  }
};

// GET /api/courses/:courseId/quizzes
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

// POST /api/courses/:courseId/bookmark
exports.bookmarkCourse = async (req, res) => {
  const courseId = Number(req.params.courseId);
  const userId = req.user.id;

  try {
    const [course, bookmarkCount] = await Promise.all([
      prisma.course.findUnique({
        where: {
          id: Number(courseId),
          isActive: true,
        },
      }),
      prisma.bookmarkCourse.count({
        where: {
          userId: userId,
        },
      }),
    ]);

    if (!course) {
      return res.status(404).json({ message: "Course tidak ditemukan" });
    }

    if (bookmarkCount >= 100) {
      return res.status(400).json({
        message:
          "Anda sudah memiliki 100 bookmark, silakan hapus bookmark yang tidak perlu lagi untuk membuat bookmark baru",
      });
    }

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
        isBookmarked: false,
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
        isBookmarked: true,
      });
    }
  } catch (e) {
    console.error("Error bookmarking course:", e);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

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
            category: true,
          },
        },
      },
    });

    if (!bookmarks || bookmarks.length === 0) {
      return res.status(200).json({
        message: "Belum ada course yang di-bookmark",
        courses: [],
      });
    }

    // Transform response untuk struktur yang lebih clean
    const courses = bookmarks.map((bookmark) => bookmark.course);

    return res.status(200).json({
      message: "Berhasil mengambil daftar course yang di-bookmark",
      count: courses.length,
      courses,
    });
  } catch (e) {
    console.error("Error getting bookmarked courses:", e);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

// GET /api/courses/:courseId/is-bookmarked
exports.isBookmarked = async (req, res) => {
  const { courseId } = req.params;
  const userId = req.user.id;

  try {
    const bookmark = await prisma.bookmarkCourse.findFirst({
      where: {
        userId,
        courseId: Number(courseId),
      },
    });

    return res.status(200).json({
      isBookmarked: !!bookmark,
    });
  } catch (e) {
    console.error("Error checking bookmark status:", e);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

//GET /api/courses/:courseId/certificate
exports.generateCertificate = async (req, res) => {
  const { courseId } = req.params;
  const userId = req.user.id;

  try {
    //cek apakah user sudah menyelesaikan course
    const [course, courseProgress, user] = await Promise.all([
      prisma.course.findUnique({
        where: {
          id: Number(courseId),
        },
        include: {
          category: true,
        },
      }),
      prisma.courseProgress.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId: Number(courseId),
          },
        },
      }),
      prisma.user.findUnique({
        where: {
          id: userId,
        },
      }),
    ]);

    if (!course) {
      return res.status(404).json({ message: "Course tidak ditemukan" });
    }

    if (!courseProgress || !courseProgress.isCompleted) {
      return res
        .status(400)
        .json({ message: "Anda belum menyelesaikan course ini" });
    }

    //generate nama file sertif
    const certificateId = `CERT-${courseId}-${userId}-${Date.now()}`;
    const fileName = `${certificateId}.pdf`;
    const filePath = path.join(__dirname, "../temp", fileName);

    //buat pdf
    const doc = new PDFDocument({
      layout: "landscape",
      size: "A4",
    });

    //stream pdf ke file
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    //design sertif
    doc
      .font("Helvetica-Bold")
      .fontSize(40)
      .text("Certificate of Completion", { align: "center" })
      .moveDown()
      .fontSize(25)
      .text(course.title, { align: "center" })
      .moveDown()
      .fontSize(20)
      .text("This is to certify that", { align: "center" })
      .moveDown()
      .fontSize(30)
      .text(user.fullName, { align: "center" })
      .moveDown()
      .fontSize(20)
      .text("has successfully completed the course", { align: "center" })
      .moveDown()
      .fontSize(15)
      .text(`Category: ${course.category.name}`, { align: "center" })
      .moveDown()
      .fontSize(15)
      .text(
        `Completion Date: ${moment(courseProgress.updatedAt).format(
          "MMMM Do YYYY"
        )}`,
        { align: "center" }
      )
      .moveDown()
      .fontSize(15)
      .text(`Certificate ID: ${certificateId}`, { align: "center" });
    // Tambah border
    doc.rect(50, 50, 700, 500).stroke();

    // Finalize PDF
    doc.end();

    // Tunggu file selesai ditulis
    writeStream.on("finish", async () => {
      try {
        // Upload ke storage
        const uploadResult = await storageService.uploadFile(
          filePath,
          storageService.FileCategory.CERTIFICATE,
          certificateId
        );

        // Simpan info sertifikat ke database
        await prisma.certificate.create({
          data: {
            userId,
            courseId: Number(courseId),
            certificateId,
            fileUrl: uploadResult.fileUrl,
            s3Key: uploadResult.fileName,
            issuedAt: new Date(),
          },
        });

        // Hapus file temporary
        fs.unlinkSync(filePath);

        // Return URL sertifikat
        return res.status(200).json({
          message: "Sertifikat berhasil dibuat",
          certificateUrl: uploadResult.fileUrl,
          certificateId,
        });
      } catch (uploadError) {
        console.error("Error uploading certificate:", uploadError);
        return res.status(500).json({
          message: "Gagal mengupload sertifikat",
        });
      }
    });
  } catch (error) {
    console.error("Error generating certificate:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan server",
    });
  }
};

//GET /api/courses/:courseId/certificate
/**
 * @swagger
 * /api/courses/{courseId}/certificate:
 *   get:
 *     summary: Ambil sertifikat course
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sertifikat berhasil diambil
 *       404:
 *         description: Sertifikat tidak ditemukan
 *       500:
 *         description: Server error
 */
exports.getCourseCertificate = async (req, res) => {
  try {
    const userId = req.user.id;
    const courseId = parseInt(req.params.courseId);

    const cert = await prisma.certificate.findFirst({
      where: {
        userId,
        courseId,
      },
    });

    if (!cert) {
      return res.status(404).json({
        message: "Sertifikat tidak ditemukan",
      });
    }

    return res.status(200).json({
      message: "Sertifikat berhasil diambil",
      cert,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      message: "Terjadi kesalahan server",
    });
  }
};

exports.downloadCertificate = async (req, res) => {
  try {
    const userId = req.user.id;
    const courseId = parseInt(req.params.courseId);

    const cert = await prisma.certificate.findFirst({
      where: {
        userId,
        courseId,
      },
    });

    if (!cert) {
      return res.status(404).json({
        message: "Sertifikat tidak ditemukan",
      });
    }

    const fileUrl = cert.fileUrl;
    const fileName = cert.s3Key;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    const fileStream = await storageService.getFileStream(fileUrl);
    fileStream.pipe(res);

    return res.status(200).json({
      message: "Sertifikat berhasil diunduh",
      fileUrl,
      fileName,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      message: "Terjadi kesalahan server",
    });
  }
};

// GET /api/courses/:id/reviews
exports.getCourseReviews = async (req, res) => {
  try {
    const courseId = parseInt(req.params.id);
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const [reviews, total, avgRating] = await Promise.all([
      prisma.courseReview.findMany({
        where: { courseId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePicture: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.courseReview.count({ where: { courseId } }),
      prisma.courseReview.aggregate({
        where: { courseId },
        _avg: { rating: true },
        _count: { rating: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        },
        stats: {
          averageRating: avgRating._avg.rating ? Math.round(avgRating._avg.rating * 10) / 10 : 0,
          totalReviews: avgRating._count.rating
        }
      }
    });
  } catch (error) {
    console.error('Error getting course reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil review course',
      error: error.message
    });
  }
};

// POST /api/courses/:id/reviews
exports.createCourseReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const courseId = parseInt(req.params.id);
    const { rating, comment } = req.body;

    // Validasi input
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating harus antara 1-5'
      });
    }

    // Cek apakah user sudah enroll di course
    const enrollment = await prisma.enrollment.findFirst({
      where: { userId, courseId }
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'Anda harus enroll di course ini untuk memberikan review'
      });
    }

    // Cek apakah user sudah pernah review
    const existingReview = await prisma.courseReview.findUnique({
      where: { userId_courseId: { userId, courseId } }
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'Anda sudah memberikan review untuk course ini'
      });
    }

    // Buat review baru
    const review = await prisma.courseReview.create({
      data: {
        userId,
        courseId,
        rating: parseInt(rating),
        comment: comment || null
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePicture: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Review berhasil ditambahkan',
      data: review
    });
  } catch (error) {
    console.error('Error creating course review:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menambahkan review',
      error: error.message
    });
  }
};

// PUT /api/courses/:id/reviews (edit review sendiri)
exports.updateCourseReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const courseId = parseInt(req.params.id);
    const { rating, comment } = req.body;

    // Validasi input
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating harus antara 1-5'
      });
    }

    // Cek apakah review ada dan milik user
    const existingReview = await prisma.courseReview.findUnique({
      where: { userId_courseId: { userId, courseId } }
    });

    if (!existingReview) {
      return res.status(404).json({
        success: false,
        message: 'Review tidak ditemukan'
      });
    }

    // Update review
    const updatedReview = await prisma.courseReview.update({
      where: { userId_courseId: { userId, courseId } },
      data: {
        rating: parseInt(rating),
        comment: comment || null
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePicture: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Review berhasil diupdate',
      data: updatedReview
    });
  } catch (error) {
    console.error('Error updating course review:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate review',
      error: error.message
    });
  }
};

// DELETE /api/courses/:id/reviews (hapus review sendiri)
exports.deleteCourseReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const courseId = parseInt(req.params.id);

    // Cek apakah review ada dan milik user
    const existingReview = await prisma.courseReview.findUnique({
      where: { userId_courseId: { userId, courseId } }
    });

    if (!existingReview) {
      return res.status(404).json({
        success: false,
        message: 'Review tidak ditemukan'
      });
    }

    // Hapus review
    await prisma.courseReview.delete({
      where: { userId_courseId: { userId, courseId } }
    });

    res.json({
      success: true,
      message: 'Review berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleting course review:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus review',
      error: error.message
    });
  }
};

// GET /api/courses/:id/reviews/me (cek review sendiri)
exports.getMyReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const courseId = parseInt(req.params.id);

    const review = await prisma.courseReview.findUnique({
      where: { userId_courseId: { userId, courseId } },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePicture: true
          }
        }
      }
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Anda belum memberikan review untuk course ini'
      });
    }

    res.json({
      success: true,
      data: review
    });
  } catch (error) {
    console.error('Error getting my review:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil review',
      error: error.message
    });
  }
};

// GET /api/courses/videos/proxy/:videoId - Proxy video content from private B2
exports.proxyVideoContent = async (req, res) => {
  const { videoId } = req.params;
  
  try {
    // Cari video di database
    const video = await prisma.coursevideo.findUnique({
      where: { id: Number(videoId) },
      include: { 
        course: {
          include: { enrollment: true }
        }
      }
    });

    if (!video) {
      return res.status(404).json({ message: "Video tidak ditemukan" });
    }

    // Authentication/authorization check
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    // Check if user enrolled in course or is admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });
    
    const isAdmin = user?.role === 'ADMIN';
    const isEnrolled = video.course.enrollment.some(e => e.userId === userId);
    const isCreator = video.course.createdById === userId;
    
    if (!isEnrolled && !isAdmin && !isCreator) {
      return res.status(403).json({ 
        message: "Akses ditolak - Anda harus enroll di course ini atau menjadi admin" 
      });
    }

    if (!video.s3Key) {
      return res.status(400).json({ message: "Video file tidak ditemukan" });
    }

    // Generate signed URL untuk akses internal
    const signedUrl = await storageService.generateSignedUrl(video.s3Key, 3600); // 1 hour
    
    // Set headers untuk video streaming
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    // Handle range requests untuk video streaming
    const range = req.headers.range;
    
    if (range) {
      // Get file info first untuk content length
      try {
        const urlObj = new URL(signedUrl);
        const protocol = urlObj.protocol === 'https:' ? https : http;
        
        // Head request untuk dapatkan content length
        const headReq = protocol.request({
          hostname: urlObj.hostname,
          port: urlObj.port,
          path: urlObj.pathname + urlObj.search,
          method: 'HEAD',
          headers: {
            'Authorization': urlObj.searchParams.get('Authorization') || ''
          }
        }, (headRes) => {
          const contentLength = parseInt(headRes.headers['content-length'] || '0');
          
          if (contentLength === 0) {
            return res.status(500).json({ message: "Cannot determine file size" });
          }
          
          // Parse range
          const parts = range.replace(/bytes=/, "").split("-");
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : contentLength - 1;
          const chunksize = (end - start) + 1;
          
          // Set partial content headers
          res.status(206);
          res.setHeader('Content-Range', `bytes ${start}-${end}/${contentLength}`);
          res.setHeader('Content-Length', chunksize.toString());
          
          // Stream the requested range
          const getReq = protocol.request({
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: {
              'Authorization': urlObj.searchParams.get('Authorization') || '',
              'Range': `bytes=${start}-${end}`
            }
          }, (getRes) => {
            getRes.pipe(res);
          });
          
          getReq.on('error', (error) => {
            console.error('Error streaming video:', error);
            res.status(500).json({ message: "Error streaming video" });
          });
          
          getReq.end();
        });
        
        headReq.on('error', (error) => {
          console.error('Error getting file info:', error);
          res.status(500).json({ message: "Error accessing video file" });
        });
        
        headReq.end();
        
      } catch (error) {
        console.error('Error parsing signed URL:', error);
        res.status(500).json({ message: "Error processing video request" });
      }
    } else {
      // No range, stream entire file
      try {
        const urlObj = new URL(signedUrl);
        const protocol = urlObj.protocol === 'https:' ? https : http;
        
        const getReq = protocol.request({
          hostname: urlObj.hostname,
          port: urlObj.port,
          path: urlObj.pathname + urlObj.search,
          method: 'GET',
          headers: {
            'Authorization': urlObj.searchParams.get('Authorization') || ''
          }
        }, (getRes) => {
          // Set content length if available
          if (getRes.headers['content-length']) {
            res.setHeader('Content-Length', getRes.headers['content-length']);
          }
          
          getRes.pipe(res);
        });
        
        getReq.on('error', (error) => {
          console.error('Error streaming video:', error);
          res.status(500).json({ message: "Error streaming video" });
        });
        
        getReq.end();
        
      } catch (error) {
        console.error('Error streaming video:', error);
        res.status(500).json({ message: "Error processing video request" });
      }
    }
    
  } catch (error) {
    console.error('[proxyVideoContent] Error:', error);
    res.status(500).json({ 
      message: "Error accessing video",
      error: error.message 
    });
  }
};