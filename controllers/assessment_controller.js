const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { mapAssessmentToRoadmap } = require("../services/roadmap_service");

class AssessmentController {
  /**
   * Membuat assessment baru untuk user
   * @param {Object} req - Request object
   * @param {Object} res - Response object
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
   * Mengecek status assessment user
   * @param {Object} req - Request object
   * @param {Object} res - Response object
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
