const prisma = require("../prisma/client");
const { mapAssessmentToRoadmap } = require("../services/roadmap_service");

/**
 * @swagger
 * components:
 *   schemas:
 *     AssessmentRequest:
 *       type: object
 *       required:
 *         - studentStatus
 *         - majorStudy
 *         - currentSemester
 *         - currentField
 *         - interestedField
 *         - dreamJob
 *         - mainGoal
 *       properties:
 *         studentStatus:
 *           type: string
 *           enum: [high_school, college, graduate, working]
 *           description: Status pendidikan/karier user
 *         majorStudy:
 *           type: string
 *           description: Jurusan kuliah (jika mahasiswa)
 *         currentSemester:
 *           type: integer
 *           minimum: 1
 *           maximum: 14
 *           description: Semester saat ini (jika mahasiswa)
 *         currentField:
 *           type: string
 *           enum: [Web Development, Mobile Development, Data Science, UI/UX Design, Game Development, Cyber Security, Cloud Computing, Digital Marketing, Other]
 *           description: Bidang yang sedang dipelajari
 *         interestedField:
 *           type: string
 *           enum: [Web Development, Mobile Development, Data Science, UI/UX Design, Game Development, Cyber Security, Cloud Computing, Digital Marketing]
 *           description: Bidang yang diminati
 *         dreamJob:
 *           type: string
 *           description: Pekerjaan impian
 *         mainGoal:
 *           type: string
 *           description: Tujuan utama belajar
 *     Assessment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID unik assessment
 *         userId:
 *           type: string
 *           description: ID user
 *         studentStatus:
 *           type: string
 *           enum: [high_school, college, graduate, working]
 *         majorStudy:
 *           type: string
 *         currentSemester:
 *           type: integer
 *         currentField:
 *           type: string
 *         interestedField:
 *           type: string
 *         dreamJob:
 *           type: string
 *         mainGoal:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

class AssessmentController {
  /**
   * @swagger
   * /api/assessment:
   *   post:
   *     summary: Buat assessment baru untuk user
   *     tags: [Assessment]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/AssessmentRequest'
   *     responses:
   *       201:
   *         description: Assessment berhasil dibuat
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 message:
   *                   type: string
   *                   example: Assessment berhasil dibuat
   *                 data:
   *                   $ref: '#/components/schemas/Assessment'
   *       400:
   *         description: User sudah memiliki assessment
   *       500:
   *         description: Server error
   */
  static async createAssessment(req, res) {
    try {
      const userId = req.user.id;
      const {
        studentStatus,
        majorStudy,
        currentSemester,
        currentField,
        interestedField,
        dreamJob,
        mainGoal
      } = req.body;

      // Cek apakah user sudah punya assessment
      const existingAssessment = await prisma.assessment.findFirst({
        where: { userId }
      });

      if (existingAssessment) {
        return res.status(400).json({
          status: 'error',
          message: 'User sudah memiliki assessment'
        });
      }

      // Buat assessment baru
      const assessment = await prisma.assessment.create({
        data: {
          userId,
          studentStatus,
          majorStudy,
          currentSemester,
          currentField,
          interestedField,
          dreamJob,
          mainGoal
        }
      });

      await mapAssessmentToRoadmap(userId);
      return res.status(201).json({
        status: 'success',
        message: 'Assessment berhasil dibuat',
        data: assessment
      });

    } catch (error) {
      console.error('Error in createAssessment:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan server',
        error: error.message
      });
    }
  }

  /**
   * @swagger
   * /api/assessment/check:
   *   get:
   *     summary: Cek status assessment user
   *     tags: [Assessment]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Status assessment berhasil diambil
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   $ref: '#/components/schemas/Assessment'
   *       404:
   *         description: Assessment tidak ditemukan
   *       500:
   *         description: Server error
   */
  static async checkAssessment(req, res) {
    try {
      const userId = req.user.id;

      const assessment = await prisma.assessment.findFirst({
        where: { userId },
        select: {
          id: true,
          studentStatus: true,
          majorStudy: true,
          currentSemester: true,
          currentField: true,
          interestedField: true,
          dreamJob: true,
          mainGoal: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!assessment) {
        return res.status(404).json({
          status: 'error',
          message: 'Assessment tidak ditemukan'
        });
      }

      return res.status(200).json({
        status: 'success',
        data: assessment
      });

    } catch (error) {
      console.error('Error in checkAssessment:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan server',
        error: error.message
      });
    }
  }
}

module.exports = AssessmentController;
