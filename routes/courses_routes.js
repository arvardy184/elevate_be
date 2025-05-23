const express = require("express");
const router = express.Router();
const { verifyToken, checkRole } = require("../middleware/auth_middleware");
const {
  handleUploadError,
  uploadCourseVideo,
} = require("../middleware/upload_middleware");

/**
 * @swagger
 * /courses:
 *   get:
 *     summary: Mendapatkan daftar semua courses
 *     tags: [Course]
 *     responses:
 *       200:
 *         description: Berhasil mendapatkan list courses
 */

const courseController = require("../controllers/course_controller");

// GET /api/courses
router.get("/", courseController.getCourses);

// GET /api/courses/me - harus sebelum /:id
router.get("/me", verifyToken, courseController.GetMyCourses);

// GET /api/courses/bookmarks - harus sebelum /:id
router.get("/bookmarks", verifyToken, courseController.getBookmarkedCourses);

// GET /api/courses/:id
router.get("/:id", courseController.getCourseById);

// POST /api/courses/:id/enroll
router.post("/:id/enroll", verifyToken, courseController.enrollCourse);

// POST /api/courses/:courseId/bookmark
router.post(
  "/:courseId/bookmark",
  verifyToken,
  courseController.bookmarkCourse
);

// GET /api/courses/:courseId/is-bookmarked
router.get(
  "/:courseId/is-bookmarked",
  verifyToken,
  courseController.isBookmarked
);

//post /api/:lessonId/progress
router.post(
  "/:lessonId/progress",
  verifyToken,
  courseController.updateLessonProgress
);

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
  courseController.getQuizzezForCourse
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

// POST /api/courses/:courseId/videos
// Admin/Creator: Menambah video ke kursus
router.post(
  "/:courseId/videos",
  verifyToken,
  handleUploadError(uploadCourseVideo),
  courseController.addCourseVideo
);

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
