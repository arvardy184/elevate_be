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
  const userId = req.user?.id; // Optional user ID (jika ada token)

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
    
    const [courses, totalCourses, userEnrollments] = await Promise.all([
      prisma.course.findMany({
        where: whereClause,
        include: { category: true },
        skip: skip,
        take: take,
        orderBy: { createdAt: "desc" }, // sort dari yang paling baru
      }),
      prisma.course.count({
        where: whereClause,
      }),
      // Ambil enrollment user jika ada userId
      userId ? prisma.enrollment.findMany({
        where: { userId },
        select: { courseId: true }
      }) : []
    ]);

    // Buat Set untuk course IDs yang sudah di-enroll user (untuk performance)
    const enrolledCourseIds = new Set(
      userEnrollments.map(enrollment => enrollment.courseId)
    );

    // Tambahkan field isEnrolled ke setiap course
    const coursesWithEnrollmentStatus = courses.map(course => ({
      ...course,
      isEnrolled: userId ? enrolledCourseIds.has(course.id) : null // null jika user belum login
    }));

    return res.status(200).json({
      courses: coursesWithEnrollmentStatus,
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
    
    //sementara tanpa pembayaran
    // if (course.isPaid) {
    //   return res.status(402).json({
    //     message:
    //       "Course ini berbayar. Silakan lakukan pembayaran terlebih dahulu.",
    //   });
    // }

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
/**
 * @swagger
 * /api/courses/{courseId}/videos:
 *   post:
 *     summary: Upload video ke course (Creator/Admin only)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID course
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - video
 *               - title
 *             properties:
 *               video:
 *                 type: string
 *                 format: binary
 *                 description: File video (MP4, MOV, AVI, MKV)
 *               title:
 *                 type: string
 *                 description: Judul video
 *               isLocked:
 *                 type: boolean
 *                 description: Apakah video dikunci (default false)
 *     responses:
 *       201:
 *         description: Video berhasil ditambahkan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 video:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     title:
 *                       type: string
 *                     videoUrl:
 *                       type: string
 *                       description: Proxy URL untuk akses video
 *                     isLocked:
 *                       type: boolean
 *                     order:
 *                       type: integer
 *                     isProxied:
 *                       type: boolean
 *                 note:
 *                   type: string
 *       400:
 *         description: File tidak valid atau tidak ada
 *       403:
 *         description: Hanya creator course atau admin yang dapat mengupload
 *       404:
 *         description: Course tidak ditemukan
 *       500:
 *         description: Server error
 */
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
/**
 * @swagger
 * /api/courses/{courseId}/quizzes:
 *   get:
 *     summary: Ambil semua quiz dalam course (dengan pertanyaan lengkap)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID course
 *     responses:
 *       200:
 *         description: Daftar quiz berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 quizzes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       courseId:
 *                         type: integer
 *                       question:
 *                         type: string
 *                       options:
 *                         type: array
 *                         items:
 *                           type: string
 *                       correctAnswer:
 *                         type: string
 *                       isLocked:
 *                         type: boolean
 *       404:
 *         description: Tidak ada quiz untuk kursus ini
 *       500:
 *         description: Server error
 */
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

// GET /api/courses/:courseId/quizzes/list - Metadata quiz saja (tanpa pertanyaan)
/**
 * @swagger
 * /api/courses/{courseId}/quizzes/list:
 *   get:
 *     summary: Ambil daftar metadata quiz saja (tanpa pertanyaan)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID course
 *     responses:
 *       200:
 *         description: Daftar metadata quiz berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 quizzes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       courseId:
 *                         type: integer
 *                       isLocked:
 *                         type: boolean
 *                       title:
 *                         type: string
 *                         example: "Quiz 1"
 *                       order:
 *                         type: integer
 *                 count:
 *                   type: integer
 *                 message:
 *                   type: string
 *       404:
 *         description: Tidak ada quiz untuk kursus ini
 *       500:
 *         description: Server error
 */
exports.getCourseQuizzesMetadata = async (req, res) => {
  const { courseId } = req.params;

  try {
    const quizzes = await prisma.quiz.findMany({
      where: {
        courseId: Number(courseId),
      },
      select: {
        id: true,
        courseId: true,
        isLocked: true,
        // Tidak include question, options, correctAnswer
      },
    });

    if (!quizzes.length) {
      return res
        .status(404)
        .json({ message: "Tidak ada quiz untuk kursus ini" });
    }
    
    // Tambah info tambahan untuk setiap quiz
    const quizzesWithMetadata = quizzes.map((quiz, index) => ({
      ...quiz,
      title: `Quiz ${index + 1}`, // Generate title sederhana
      order: index + 1,
    }));
    
    return res.status(200).json({ 
      quizzes: quizzesWithMetadata,
      count: quizzes.length,
      message: "Daftar quiz berhasil diambil (metadata saja)"
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

// GET /api/courses/:courseId/quizzes/:quizId - Detail quiz individual dengan pertanyaan
/**
 * @swagger
 * /api/courses/{courseId}/quizzes/{quizId}:
 *   get:
 *     summary: Ambil detail quiz individual dengan pertanyaan
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID course
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID quiz
 *     responses:
 *       200:
 *         description: Detail quiz berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 quiz:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     courseId:
 *                       type: integer
 *                     question:
 *                       type: string
 *                     options:
 *                       type: array
 *                       items:
 *                         type: string
 *                     correctAnswer:
 *                       type: string
 *                     isLocked:
 *                       type: boolean
 *                 hasSubmitted:
 *                   type: boolean
 *                   description: Apakah user sudah submit quiz ini
 *                 submission:
 *                   type: object
 *                   nullable: true
 *                   description: Data submission jika sudah pernah submit
 *       400:
 *         description: Quiz tidak terkait dengan course ini
 *       403:
 *         description: Belum terdaftar di course ini
 *       404:
 *         description: Quiz tidak ditemukan
 *       500:
 *         description: Server error
 */
exports.getQuizDetail = async (req, res) => {
  const { courseId, quizId } = req.params;
  const userId = req.user.id;

  try {
    // Cek apakah user sudah enroll di course
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

    const quiz = await prisma.quiz.findUnique({
      where: {
        id: Number(quizId),
      },
    });

    if (!quiz) {
      return res.status(404).json({ message: "Quiz tidak ditemukan" });
    }

    if (quiz.courseId !== Number(courseId)) {
      return res.status(400).json({ message: "Quiz tidak terkait dengan course ini" });
    }

    // Cek apakah user sudah pernah submit quiz ini
    const existingSubmission = await prisma.quizSubmission.findFirst({
      where: {
        userId,
        quizId: Number(quizId),
      },
    });

    return res.status(200).json({ 
      quiz,
      hasSubmitted: !!existingSubmission,
      submission: existingSubmission || null
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

// POST /api/courses/:courseId/bookmark
/**
 * @swagger
 * /api/courses/{courseId}/bookmark:
 *   post:
 *     summary: Toggle bookmark course (tambah/hapus bookmark)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID course
 *     responses:
 *       200:
 *         description: Bookmark berhasil dihapus (toggle off)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Bookmark berhasil dihapus"
 *                 isBookmarked:
 *                   type: boolean
 *                   example: false
 *       201:
 *         description: Course berhasil di-bookmark (toggle on)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Course berhasil di-bookmark"
 *                 isBookmarked:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Sudah memiliki 100 bookmark (limit reached)
 *       404:
 *         description: Course tidak ditemukan
 *       500:
 *         description: Server error
 */
exports.bookmarkCourse = async (req, res) => {
  const courseId = Number(req.params.courseId);
exports.resetCourseSubmissions = async (req, res) => {
  const { courseId } = req.params;
  const { targetUserId } = req.body; // Optional: reset submission user tertentu saja

  try {
    // Cek apakah course ada
    const course = await prisma.course.findUnique({
      where: { id: Number(courseId) }
    });

    if (!course) {
      return res.status(404).json({ message: "Course tidak ditemukan" });
    }

    const whereClause = {
      courseId: Number(courseId),
    };

    // Jika ada targetUserId, reset submission user tertentu saja
    if (targetUserId) {
      whereClause.userId = Number(targetUserId);
    }

    // Hapus semua submission
    const deletedSubmissions = await prisma.quizSubmission.deleteMany({
      where: whereClause,
    });

    return res.status(200).json({
      message: `Berhasil reset ${deletedSubmissions.count} quiz submissions untuk course ${course.title}`,
      deletedCount: deletedSubmissions.count,
      targetUserId: targetUserId || "semua user",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

// DELETE /api/admin/quiz-submissions/:submissionId - Admin hapus submission tertentu
/**
 * @swagger
 * /api/admin/quiz-submissions/{submissionId}:
 *   delete:
 *     summary: Admin hapus quiz submission tertentu berdasarkan ID
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID quiz submission
 *     responses:
 *       200:
 *         description: Quiz submission berhasil dihapus
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 deletedSubmission:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     user:
 *                       type: string
 *                       description: Nama user
 *                     course:
 *                       type: string
 *                       description: Nama course
 *                     quizId:
 *                       type: integer
 *                     score:
 *                       type: integer
 *       404:
 *         description: Quiz submission tidak ditemukan
 *       500:
 *         description: Server error
 */
exports.adminDeleteQuizSubmission = async (req, res) => {
  const { submissionId } = req.params;

  try {
    // Cek apakah submission ada
    const submission = await prisma.quizSubmission.findUnique({
      where: { id: Number(submissionId) },
      include: {
        users: { select: { firstName: true, lastName: true } },
        quiz: { select: { id: true } },
        course: { select: { title: true } }
      }
    });

    if (!submission) {
      return res.status(404).json({ 
        message: "Quiz submission tidak ditemukan" 
      });
    }

    // Hapus submission
    await prisma.quizSubmission.delete({
      where: { id: Number(submissionId) },
    });

    return res.status(200).json({
      message: "Quiz submission berhasil dihapus oleh admin",
      deletedSubmission: {
        id: submission.id,
        user: `${submission.users.firstName} ${submission.users.lastName}`,
        course: submission.course.title,
        quizId: submission.quiz.id,
        score: submission.score,
        totalQuestions: submission.totalQuestions,
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
}};