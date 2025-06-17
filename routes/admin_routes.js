const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/auth_middleware');
const {
  handleUploadError,
  uploadCourseVideo,
  uploadCourseThumbnail
} = require('../middleware/upload_middleware');
const AdminController = require('../controllers/admin_controller');

// Middleware: Semua route admin butuh token dan role ADMIN
router.use(verifyToken);
router.use(checkRole('ADMIN'));

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin management endpoints
 */

// ===== DASHBOARD & ANALYTICS =====
/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Get dashboard analytics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 */
router.get('/dashboard', AdminController.getDashboard);

/**
 * @swagger
 * /admin/analytics:
 *   get:
 *     summary: Get detailed analytics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics data retrieved successfully
 */
router.get('/analytics', AdminController.getAnalytics);

// ===== USER MANAGEMENT =====
/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get all users with pagination
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [USER, CONSULTANT, ADMIN]
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 */
router.get('/users', AdminController.getUsers);

/**
 * @swagger
 * /admin/users/{id}:
 *   get:
 *     summary: Get user detail
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User detail retrieved successfully
 */
router.get('/users/:id', AdminController.getUserDetail);

/**
 * @swagger
 * /admin/users/{id}/role:
 *   put:
 *     summary: Update user role
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [USER, CONSULTANT, ADMIN]
 *     responses:
 *       200:
 *         description: User role updated successfully
 */
router.put('/users/:id/role', AdminController.updateUserRole);

/**
 * @swagger
 * /admin/users/{id}:
 *   delete:
 *     summary: Delete user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 */
router.delete('/users/:id', AdminController.deleteUser);

// ===== COURSE MANAGEMENT =====
/**
 * @swagger
 * /admin/courses:
 *   get:
 *     summary: Get all courses for admin
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Courses retrieved successfully
 */
router.get('/courses', AdminController.getCourses);

/**
 * @swagger
 * /admin/courses:
 *   post:
 *     summary: Create new course
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               categoryId:
 *                 type: integer
 *               isPaid:
 *                 type: boolean
 *               price:
 *                 type: number
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Course created successfully
 */
router.post('/courses', handleUploadError(uploadCourseThumbnail), AdminController.createCourse);

/**
 * @swagger
 * /admin/courses/{id}:
 *   put:
 *     summary: Update course
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               categoryId:
 *                 type: integer
 *               isPaid:
 *                 type: boolean
 *               price:
 *                 type: number
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Course updated successfully
 */
router.put('/courses/:id', handleUploadError(uploadCourseThumbnail), AdminController.updateCourse);

/**
 * @swagger
 * /admin/courses/{id}:
 *   delete:
 *     summary: Delete course
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Course deleted successfully
 */
router.delete('/courses/:id', AdminController.deleteCourse);

// ===== LESSON MANAGEMENT =====
/**
 * @swagger
 * /admin/courses/{courseId}/lessons:
 *   post:
 *     summary: Add lesson to course
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
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
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               order:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Lesson created successfully
 */
router.post('/courses/:courseId/lessons', AdminController.createLesson);

/**
 * @swagger
 * /admin/courses/{courseId}/lessons/{lessonId}:
 *   put:
 *     summary: Update lesson
 *     tags: [Admin]
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
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               order:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Lesson updated successfully
 */
router.put('/courses/:courseId/lessons/:lessonId', AdminController.updateLesson);

/**
 * @swagger
 * /admin/courses/{courseId}/lessons/{lessonId}:
 *   delete:
 *     summary: Delete lesson
 *     tags: [Admin]
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
 *     responses:
 *       200:
 *         description: Lesson deleted successfully
 */
router.delete('/courses/:courseId/lessons/:lessonId', AdminController.deleteLesson);

// ===== VIDEO MANAGEMENT =====
/**
 * @swagger
 * /admin/courses/{courseId}/videos:
 *   post:
 *     summary: Upload video to course
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               order:
 *                 type: integer
 *               video:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Video uploaded successfully
 */
router.post('/courses/:courseId/videos', handleUploadError(uploadCourseVideo), AdminController.uploadCourseVideo);

/**
 * @swagger
 * /admin/courses/{courseId}/videos/{videoId}:
 *   delete:
 *     summary: Delete course video
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Video deleted successfully
 */
router.delete('/courses/:courseId/videos/:videoId', AdminController.deleteCourseVideo);

// ===== ROADMAP MANAGEMENT =====
/**
 * @swagger
 * /admin/roadmaps:
 *   get:
 *     summary: Get all roadmaps for admin
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: field
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Roadmaps retrieved successfully
 */
router.get('/roadmaps', AdminController.getRoadmaps);

/**
 * @swagger
 * /admin/roadmaps:
 *   post:
 *     summary: Create new roadmap
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               field:
 *                 type: string
 *                 enum: [Web Development, Mobile Development, Data Science, UI/UX Design, Game Development, Cyber Security, Cloud Computing, Digital Marketing]
 *               level:
 *                 type: string
 *                 enum: [beginner, intermediate, advanced]
 *               isPaid:
 *                 type: boolean
 *               price:
 *                 type: number
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Roadmap created successfully
 */
router.post('/roadmaps', AdminController.createRoadmap);

/**
 * @swagger
 * /admin/roadmaps/{id}:
 *   put:
 *     summary: Update roadmap
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               field:
 *                 type: string
 *               level:
 *                 type: string
 *               isPaid:
 *                 type: boolean
 *               price:
 *                 type: number
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Roadmap updated successfully
 */
router.put('/roadmaps/:id', AdminController.updateRoadmap);

/**
 * @swagger
 * /admin/roadmaps/{id}:
 *   delete:
 *     summary: Delete roadmap
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Roadmap deleted successfully
 */
router.delete('/roadmaps/:id', AdminController.deleteRoadmap);

/**
 * @swagger
 * /admin/roadmaps/{roadmapId}/courses:
 *   post:
 *     summary: Add course to roadmap
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roadmapId
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
 *               courseId:
 *                 type: integer
 *               order:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Course added to roadmap successfully
 */
router.post('/roadmaps/:roadmapId/courses', AdminController.addCourseToRoadmap);

/**
 * @swagger
 * /admin/roadmaps/{roadmapId}/courses/{courseId}:
 *   delete:
 *     summary: Remove course from roadmap
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roadmapId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Course removed from roadmap successfully
 */
router.delete('/roadmaps/:roadmapId/courses/:courseId', AdminController.removeCourseFromRoadmap);

// ===== CATEGORY MANAGEMENT =====
/**
 * @swagger
 * /admin/categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 */
router.get('/categories', AdminController.getCategories);

/**
 * @swagger
 * /admin/categories:
 *   post:
 *     summary: Create new category
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Category created successfully
 */
router.post('/categories', AdminController.createCategory);

/**
 * @swagger
 * /admin/categories/{id}:
 *   put:
 *     summary: Update category
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Category updated successfully
 */
router.put('/categories/:id', AdminController.updateCategory);

/**
 * @swagger
 * /admin/categories/{id}:
 *   delete:
 *     summary: Delete category
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Category deleted successfully
 */
router.delete('/categories/:id', AdminController.deleteCategory);

/**
 * @swagger
 * /admin/test-b2-file:
 *   get:
 *     summary: Test B2 file access and get alternative URLs
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: fileName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File access test completed
 */
router.get('/test-b2-file', AdminController.testB2FileAccess);

/**
 * @swagger
 * /admin/refresh-authorized-urls:
 *   post:
 *     summary: Refresh authorized URLs for all course thumbnails
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Authorized URLs refreshed successfully
 */
router.post('/refresh-authorized-urls', AdminController.refreshAuthorizedUrls);

// ===== QUIZ SUBMISSION MANAGEMENT =====
/**
 * @swagger
 * /admin/quiz-submissions/{submissionId}:
 *   delete:
 *     summary: Delete quiz submission by ID (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of quiz submission to delete
 *     responses:
 *       200:
 *         description: Quiz submission deleted successfully
 *       404:
 *         description: Quiz submission not found
 *       500:
 *         description: Server error
 */
router.delete('/quiz-submissions/:submissionId', require('../controllers/course_controller').adminDeleteQuizSubmission);

module.exports = router; 