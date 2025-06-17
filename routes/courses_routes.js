const express = require("express");
const router = express.Router();
const { verifyToken, checkRole, optionalAuth } = require("../middleware/auth_middleware");
const {
  handleUploadError,
  uploadCourseVideo,
} = require("../middleware/upload_middleware");

/**
 * @swagger
 * /courses:
 *   get:
 *     summary: Mendapatkan daftar semua courses dengan optional authentication
 *     tags: [Course]
 *     security:
 *       - bearerAuth: []
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
 *         description: Berhasil mendapatkan list courses
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
 *                       thumbnail:
 *                         type: string
 *                       price:
 *                         type: number
 *                       isPaid:
 *                         type: boolean
 *                       isActive:
 *                         type: boolean
 *                       category:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           name:
 *                             type: string
 *                       isEnrolled:
 *                         type: boolean
 *                         nullable: true
 *                         description: Status enrollment (null jika tidak login)
 *                       createdAt:
 *                         type: string
 *                         format: date-time
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
 */

const courseController = require("../controllers/course_controller");

// GET /api/courses - Dengan optional auth untuk field isEnrolled
router.get("/", optionalAuth, courseController.getCourses);

/**
 * @swagger
 * /courses/me:
 *   get:
 *     summary: Mendapatkan daftar course yang diikuti user
 *     tags: [Course]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mendapatkan course yang diikuti
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
 */

// GET /api/courses/me - harus sebelum /:id
router.get("/me", verifyToken, courseController.GetMyCourses);

/**
 * @swagger
 * /courses/bookmarks:
 *   get:
 *     summary: Mendapatkan daftar course yang di-bookmark user
 *     tags: [Course]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mendapatkan course yang di-bookmark
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 count:
 *                   type: integer
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
 *                       thumbnail:
 *                         type: string
 *                       category:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           name:
 *                             type: string
 */

// GET /api/courses/bookmarks - harus sebelum /:id
router.get("/bookmarks", verifyToken, courseController.getBookmarkedCourses);

/**
 * @swagger
 * /courses/{courseId}/bookmark:
 *   post:
 *     summary: Toggle bookmark course (tambah/hapus bookmark)
 *     tags: [Course]
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
 *                 isBookmarked:
 *                   type: boolean
 *       201:
 *         description: Course berhasil di-bookmark (toggle on)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 isBookmarked:
 *                   type: boolean
 *       400:
 *         description: Sudah memiliki 100 bookmark (limit reached)
 *       404:
 *         description: Course tidak ditemukan
 *       500:
 *         description: Server error
 */

// POST /api/courses/:courseId/bookmark
router.post(
  "/:courseId/bookmark",
  verifyToken,
  courseController.bookmarkCourse
);

/**
 * @swagger
 * /courses/{courseId}/is-bookmarked:
 *   get:
 *     summary: Cek apakah course sudah di-bookmark
 *     tags: [Course]
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
 *         description: Status bookmark berhasil dicek
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isBookmarked:
 *                   type: boolean
 *       500:
 *         description: Server error
 */

// GET /api/courses/:courseId/is-bookmarked
router.get(
  "/:courseId/is-bookmarked",
  verifyToken,
  courseController.isBookmarked
);

/**
 * @swagger
 * /courses/{courseId}/progress:
 *   get:
 *     summary: Dapatkan progress user dalam course
 *     tags: [Course]
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
 *         description: Progress course berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 courseId:
 *                   type: integer
 *                 userId:
 *                   type: string
 *                 totalLessons:
 *                   type: integer
 *                 completedLessons:
 *                   type: integer
 *                 totalQuizzes:
 *                   type: integer
 *                 completedQuizzes:
 *                   type: integer
 *                 isCompleted:
 *                   type: boolean
 *       403:
 *         description: Belum terdaftar di course ini
 *       404:
 *         description: Course tidak ditemukan
 *       500:
 *         description: Server error
 */

// GET /api/courses/:courseId/progress
router.get(
  "/:courseId/progress",
  verifyToken,
  courseController.getCourseProgress
);

// GET /api/courses/:courseId/quizzes
router.get(
  "/:courseId/quizzes",
  verifyToken,
  courseController.getCourseQuizzes
);

// GET /api/courses/:courseId/quizzes/list - Metadata quiz saja
router.get(
  "/:courseId/quizzes/list",
  verifyToken,
  courseController.getCourseQuizzesMetadata
);

// GET /api/courses/:courseId/quizzes/:quizId - Detail quiz individual
router.get(
  "/:courseId/quizzes/:quizId",
  verifyToken,
  courseController.getQuizDetail
);

// GET /api/courses/:courseId/videos
router.get("/:courseId/videos", verifyToken, courseController.getCourseVideos);

// POST /api/courses/:courseId/quizzes/:quizId/submit
router.post(
  "/:courseId/quizzes/:quizId/submit",
  verifyToken,
  courseController.submitQuizAnswer
);

// GET /api/courses/:courseId/quizzes/:quizId/results
router.get(
  "/:courseId/quizzes/:quizId/results",
  verifyToken,
  courseController.getQuizResult
);

// DELETE /api/courses/:courseId/quizzes/:quizId/submission - Hapus submission sendiri
router.delete(
  "/:courseId/quizzes/:quizId/submission",
  verifyToken,
  courseController.deleteMyQuizSubmission
);

// DELETE /api/courses/:courseId/submissions/reset - Reset semua submission (Admin only)
router.delete(
  "/:courseId/submissions/reset",
  verifyToken,
  checkRole('ADMIN'),
  courseController.resetCourseSubmissions
);

// POST /api/courses/:courseId/videos
// Admin/Creator: Menambah video ke kursus
router.post(
  "/:courseId/videos",
  verifyToken,
  handleUploadError(uploadCourseVideo),
  courseController.addCourseVideo
);

// GET /api/courses/:courseId/certificate
router.get(
  "/:courseId/certificate",
  verifyToken,
  courseController.getCourseCertificate
);

// GET /api/courses/:courseId/certificate/download  
router.get(
  "/:courseId/certificate/download",
  verifyToken,
  courseController.downloadCertificate
);

// Review routes
router.get('/:id/reviews', courseController.getCourseReviews);
router.post('/:id/reviews', verifyToken, courseController.createCourseReview);
router.put('/:id/reviews', verifyToken, courseController.updateCourseReview);
router.delete('/:id/reviews', verifyToken, courseController.deleteCourseReview);
router.get('/:id/reviews/me', verifyToken, courseController.getMyReview);

router.get('/videos/proxy/:videoId', verifyToken, courseController.proxyVideoContent); 
module.exports = router;

/**
 * @swagger
 * /courses/{id}:
 *   get:
 *     summary: Mendapatkan detail course
 *     tags: [Course]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID course
 *     responses:
 *       200:
 *         description: Detail course berhasil diambil
 */

/**
 * @swagger
 * /courses/{id}/enroll:
 *   post:
 *     summary: Enroll ke course tertentu
 *     tags: [Course]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Enroll berhasil
 */
// router.post("/:id/enroll", async (req, res) => {
//   const { id } = req.params;
//   const { userId } = req.body;
//   try {
//     const course = await prisma.course.findUnique({
//       where: { id: Number(id) },
//     });
//     if (!course) {
//       return res.status(404).json({
//         message: "Course tidak ditemukan",
//       });
//     }
//     const user = await prisma.user.findUnique({
//       where: { id: Number(userId) },
//     });
//     if (!user) {
//       return res.status(404).json({
//         message: "User tidak ditemukan",
//       });
//     }

//     await prisma.enrollment.create({
//       data: {
//         userId: Number(userId),
//         courseId: Number(id),
//       },
//     });
//     return res.status(200).json({
//       message: "Enroll berhasil",
//     });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({
//       message: "Terjadi kesalahan server",
//       error: {
//         message: error.message,
//       },
//     });
//   }
// });

/**
 * @swagger
 * /courses/{courseId}/progress:
 *   get:
 *     summary: Dapatkan progress user dalam course
 *     tags: [Course]
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
 */

/**
 * @swagger
 * /courses/{courseId}/quizzes:
 *   get:
 *     summary: Dapatkan daftar quiz untuk course
 *     tags: [Course]
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
 *         description: Daftar quiz berhasil diambil
 */

/**
 * @swagger
 * /courses/{courseId}/videos:
 *   get:
 *     summary: Dapatkan daftar video untuk course
 *     tags: [Course]
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
 *         description: Daftar video berhasil diambil
 */

/**
 * @swagger
 * /courses/{courseId}/quizzes/{quizId}/submit:
 *   post:
 *     summary: Submit jawaban quiz
 *     tags: [Course]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     questionId:
 *                       type: integer
 *                     answer:
 *                       type: string
 *     responses:
 *       200:
 *         description: Jawaban quiz berhasil disimpan
 */

/**
 * @swagger
 * /courses/{courseId}/quizzes/{quizId}/results:
 *   get:
 *     summary: Dapatkan hasil quiz
 *     tags: [Course]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Hasil quiz berhasil diambil
 */

// GET /api/courses/:id
router.get("/:id", optionalAuth, courseController.getCourseById);

// POST /api/courses/:id/enroll
router.post("/:id/enroll", verifyToken, courseController.enrollCourse);
