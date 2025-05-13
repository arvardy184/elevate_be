const prisma = require("../prisma/client");
const storageService = require("../utils/storage");
const path = require("path");
const PDFDocument = require('pdfkit');
const moment = require('moment');
const fs = require('fs');
const path = require('path');
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
  const { courseId } = Number(req.params.id);
  try {
    const course = await prisma.course.findUnique({
      where: { id: courseId, isActive: true },
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

// POST /api/courses/:courseId/lessons/:lessonId/progress
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
exports.getCourseProgress = async (req, res) => {
  const { courseId } = Number(req.params.id);
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

// GET /api/courses/:courseId/videos
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
  const courseId = Number(req.params.id);
  const userId = req.user.id;

  try {
    // Pastikan course ada
    const course = await prisma.course.findUnique({
      where: {
        id: Number(courseId),
        createdById: userId,
        isActive: true,
      },
    });

    if (!course) {
      return res.status(403).json({
        message: "Course tidak ditemukan atau Anda tidak memiliki akses",
      });
    }

    if (
      !req.file ||
      !["video/mp4", "video/mov", "video/avi", "video/mkv"].includes(
        req.file.mimetype
      )
    ) {
      return res
        .status(400)
        .json({ message: "File video harus berupa MP4, MOV, AVI, atau MKV" });
    }

    // Pastikan user yang mengupload adalah creator course
    if (course.createdById !== req.user.id) {
      return res.status(403).json({
        message:
          "Anda tidak memiliki akses untuk mengupload video ke course ini",
      });
    }

    let videoUrl = null;
    let s3Key = null;

    // Upload file ke storage jika ada
    if (req.file) {
      try {
        // Upload ke B2
        const cleanFileName = path.basename(
          req.file.originalname,
          path.extname(req.file.originalname)
        );
        const uploadResult = await storageService.uploadFile(
          req.file.path,
          storageService.FileCategory.COURSE_VIDEO,
          `${course.id}-${cleanFileName}`
        );

        videoUrl = uploadResult.fileUrl;
        s3Key = uploadResult.fileName;
      } catch (uploadError) {
        console.error("Error uploading to B2:", uploadError);
        return res
          .status(500)
          .json({ message: "Gagal mengupload video ke storage" });
      }
    } else {
      return res.status(400).json({ message: "File video diperlukan!" });
    }

    // Hitung order baru (urutan terakhir + 1)
    const lastVideo = await prisma.coursevideo.findFirst({
      where: { courseId: Number(id) },
      orderBy: { order: "desc" },
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
        s3Key,
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
  const userId = req.user.id;
  const { answers } = req.body; // Jawaban dari user

  try {
    cinst[(enrollment, quiz, existingSubmission)] = await Promise.all([
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

    userAnswers.forEach((answer, index) => {
      if (index < correctAnswers.length && correctAnswers[index] === answer) {
        score++;
      }
    });

    // Menyimpan jawaban user untuk quiz ini
    const quiz = await prisma.quiz.findUnique({
      where: { id: Number(quizId) },
    });

    if (!quiz) {
      return res.status(404).json({ message: "Quiz tidak ditemukan" });
    }

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
  const { courseId } = Number(req.params.courseId);
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
          courseId: Number(userId),
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

  try{

    //cek apakah user sudah menyelesaikan course
    const [course, courseProgress, user] = await Promise.all([
      prisma.course.findUnique({
        where: {
          id: Number(courseId),
          
        },
        include:{
          category: true,
        }
      }),
      prisma.courseProgress.findUnique({
        where: {
          userId_courseId:{
            userId,
            courseId: Number(courseId)
          }
        }
      }),
      prisma.user.findUnique({
        where:{
          id: userId,
        }
      })
    ]);

    if(!course){
      return res.status(404).json({message: "Course tidak ditemukan"})
    }

    if(!courseProgress || !courseProgress.isCompleted){
      return res.status(400).json({message: "Anda belum menyelesaikan course ini"});
    }

    //generate nama file sertif
    const certificateId = `CERT-${courseId}-${userId}-${Date.now()}`;
    const fileName = `${certificateId}.pdf`;
    const filePath = path.join(__dirname, '../temp', fileName);

    //buat pdf
    const doc = new PDFDocument({
      layout: 'landscape',
      size: 'A4'
    });

    //stream pdf ke file
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);


    //design sertif
    doc
      .font('Helvetica-Bold')
      .fontSize(40)
      .text('Certificate of Completion', { align: 'center' })
      .moveDown()
      .fontSize(25)
      .text(course.title, { align: 'center' })
      .moveDown()
      .fontSize(20)
      .text('This is to certify that', { align: 'center' })
      .moveDown()
      .fontSize(30)
      .text(user.fullName, { align: 'center' })
      .moveDown()
      .fontSize(20)
      .text('has successfully completed the course', { align: 'center' })
      .moveDown()
      .fontSize(15)
      .text(`Category: ${course.category.name}`, { align: 'center' })
      .moveDown()
      .fontSize(15)
      .text(`Completion Date: ${moment(courseProgress.updatedAt).format('MMMM Do YYYY')}`, { align: 'center' })
      .moveDown()
      .fontSize(15)
      .text(`Certificate ID: ${certificateId}`, { align: 'center' });
   // Tambah border
   doc.rect(50, 50, 700, 500).stroke();

   // Finalize PDF
   doc.end();

    // Tunggu file selesai ditulis
    writeStream.on('finish', async () => {
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
            issuedAt: new Date()
          }
        });

         // Hapus file temporary
         fs.unlinkSync(filePath);

         // Return URL sertifikat
         return res.status(200).json({
           message: "Sertifikat berhasil dibuat",
           certificateUrl: uploadResult.fileUrl,
           certificateId
         });
 
       } catch (uploadError) {
         console.error("Error uploading certificate:", uploadError);
         return res.status(500).json({ 
           message: "Gagal mengupload sertifikat" 
         });
       }
     });

    } catch (error) {
      console.error("Error generating certificate:", error);
      return res.status(500).json({ 
        message: "Terjadi kesalahan server" 
      });
    }
  };
