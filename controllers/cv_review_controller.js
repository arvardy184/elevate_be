const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const prisma = require('../prisma/client');
const cvParserService = require('../services/cv_parser_service');
const aiService = require('../services/ai_service');
const b2StorageService = require('../services/b2_storage_service');

// Multer config untuk upload CV
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/cv/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `cv-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('File received:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype
    });
    
    const allowedTypes = ['.pdf', '.doc', '.docx'];
    const extname = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(extname)) {
      return cb(null, true);
    } else {
      cb(new Error('Format file tidak didukung. Gunakan PDF, DOC, atau DOCX'));
    }
  }
});

class CVReviewController {
  /**
   * @swagger
   * /api/cv-review/upload:
   *   post:
   *     summary: Upload CV untuk review AI
   *     tags: [CV Review]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               cv:
   *                 type: string
   *                 format: binary
   *                 description: File CV (PDF/DOC/DOCX)
   *               careerField:
   *                 type: string
   *                 description: Bidang karir yang diinginkan
   *                 example: "Software Engineer"
   *     responses:
   *       200:
   *         description: CV berhasil diupload dan dianalisis
   *       400:
   *         description: File tidak valid atau error parsing
   *       500:
   *         description: Server error
   */
  static async uploadAndAnalyzeCV(req, res) {
    try {
      const userId = req.user.id;
      const { careerField } = req.body;
      
      console.log('Request received:', {
        body: req.body,
        file: req.file ? { 
          fieldname: req.file.fieldname, 
          originalname: req.file.originalname,
          size: req.file.size 
        } : null,
        fields: Object.keys(req.body)
      });

      if (!req.file) {
        return res.status(400).json({
          status: 'error',
          message: 'File CV wajib diupload'
        });
      }

      if (!careerField) {
        return res.status(400).json({
          status: 'error',
          message: 'Career field wajib diisi'
        });
      }

      // Extract text dari CV
      const extractedText = await cvParserService.extractText(req.file.path);
      
      if (!extractedText || extractedText.trim().length < 50) {
        // Delete file jika parsing gagal
        await fs.unlink(req.file.path).catch(console.error);
        return res.status(400).json({
          status: 'error',
          message: 'Gagal mengextract text dari CV. Pastikan file tidak corrupt dan berisi teks.'
        });
      }

      // Upload to B2 Storage
      const b2Upload = await b2StorageService.uploadCV(
        req.file.path, 
        req.file.originalname, 
        userId
      );

      if (!b2Upload.success) {
        // Delete local file dan return error
        await fs.unlink(req.file.path).catch(console.error);
        return res.status(500).json({
          status: 'error',
          message: 'Gagal mengupload CV ke cloud storage',
          error: b2Upload.error
        });
      }

      // Analisis CV dengan AI
      const analysis = await aiService.analyzeCVWithAI(extractedText, careerField);

      // Simpan ke database
      const cvReview = await prisma.cVReview.create({
        data: {
          userId: userId,
          fileName: req.file.originalname,
          filePath: req.file.path, 
          fileSize: req.file.size,
          
          // B2 Storage info
          b2FileId: b2Upload.fileId,
          b2FileName: b2Upload.fileName,
          b2FileUrl: b2Upload.url,
          
          extractedText: extractedText,
          careerField: careerField,
          
          // Scoring dari AI
          relevancyRate: analysis.scores.relevancyRate || 0,
          targetedJobRate: analysis.scores.targetedJobRate || 0,
          overallScore: analysis.scores.overallScore || 0,
          relevantSkill: analysis.scores.relevantSkill || 0,
          workExperience: analysis.scores.workExperience || 0,
          consistency: analysis.scores.consistency || 0,
          writingQuality: analysis.scores.writingQuality || 0,
          
          // AI analysis & suggestions
          aiAnalysis: analysis.aiAnalysis || {},
          suggestions: analysis.suggestions || []
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      return res.status(200).json({
        status: 'success',
        message: 'CV berhasil diupload dan dianalisis!',
        data: {
          id: cvReview.id,
          fileName: cvReview.fileName,
          careerField: cvReview.careerField,
          fileUrl: cvReview.b2FileUrl, // B2 download URL
          fileSize: cvReview.fileSize,
          scores: {
            relevancyRate: cvReview.relevancyRate,
            targetedJobRate: cvReview.targetedJobRate,
            overallScore: cvReview.overallScore,
            relevantSkill: cvReview.relevantSkill,
            workExperience: cvReview.workExperience,
            consistency: cvReview.consistency,
            writingQuality: cvReview.writingQuality
          },
          aiAnalysis: cvReview.aiAnalysis,
          suggestions: cvReview.suggestions,
          createdAt: cvReview.createdAt
        }
      });

    } catch (error) {
      console.error('Error in uploadAndAnalyzeCV:', error);
      
      // Delete file jika ada error
      if (req.file) {
        await fs.unlink(req.file.path).catch(console.error);
      }

      return res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat menganalisis CV',
        error: error.message
      });
    }
  }

  /**
   * @swagger
   * /api/cv-review/my-reviews:
   *   get:
   *     summary: Get daftar CV review user
   *     tags: [CV Review]
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
   *     responses:
   *       200:
   *         description: Daftar CV review berhasil diambil
   */
  static async getMyCVReviews(req, res) {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const [cvReviews, total] = await Promise.all([
        prisma.cVReview.findMany({
          where: { userId: userId },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit,
          select: {
            id: true,
            fileName: true,
            careerField: true,
            overallScore: true,
            relevancyRate: true,
            targetedJobRate: true,
            createdAt: true
          }
        }),
        prisma.cVReview.count({
          where: { userId: userId }
        })
      ]);

      return res.status(200).json({
        status: 'success',
        data: cvReviews,
        pagination: {
          page: page,
          limit: limit,
          total: total,
          totalPages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Error in getMyCVReviews:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat mengambil data CV review',
        error: error.message
      });
    }
  }

  /**
   * @swagger
   * /api/cv-review/{id}:
   *   get:
   *     summary: Get detail CV review
   *     tags: [CV Review]
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
   *         description: Detail CV review berhasil diambil
   *       404:
   *         description: CV review tidak ditemukan
   */
  static async getCVReviewById(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const cvReview = await prisma.cVReview.findFirst({
        where: {
          id: id,
          userId: userId
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      if (!cvReview) {
        return res.status(404).json({
          status: 'error',
          message: 'CV review tidak ditemukan'
        });
      }

      return res.status(200).json({
        status: 'success',
        data: {
          id: cvReview.id,
          fileName: cvReview.fileName,
          careerField: cvReview.careerField,
          fileSize: cvReview.fileSize,
          fileUrl: cvReview.b2FileUrl, // B2 download URL
          scores: {
            relevancyRate: cvReview.relevancyRate,
            targetedJobRate: cvReview.targetedJobRate,
            overallScore: cvReview.overallScore,
            relevantSkill: cvReview.relevantSkill,
            workExperience: cvReview.workExperience,
            consistency: cvReview.consistency,
            writingQuality: cvReview.writingQuality
          },
          aiAnalysis: cvReview.aiAnalysis,
          suggestions: cvReview.suggestions,
          extractedText: cvReview.extractedText,
          createdAt: cvReview.createdAt,
          updatedAt: cvReview.updatedAt
        }
      });

    } catch (error) {
      console.error('Error in getCVReviewById:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat mengambil detail CV review',
        error: error.message
      });
    }
  }

  /**
   * @swagger
   * /api/cv-review/{id}:
   *   put:
   *     summary: Update CV review (re-analyze with new career field)
   *     tags: [CV Review]
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
   *               careerField:
   *                 type: string
   *                 description: Career field baru untuk analisis ulang
   *                 example: "Data Scientist"
   *     responses:
   *       200:
   *         description: CV review berhasil diupdate dan dianalisis ulang
   *       404:
   *         description: CV review tidak ditemukan
   *       400:
   *         description: Career field wajib diisi
   */
  static async updateCVReview(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      // Debug logging untuk troubleshoot
      console.log('updateCVReview request:', {
        body: req.body,
        bodyType: typeof req.body,
        contentType: req.headers['content-type'],
        method: req.method
      });
      
      // Defensive check untuk req.body
      if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({
          status: 'error',
          message: 'Request body tidak valid atau kosong'
        });
      }
      
      const { careerField } = req.body;

      if (!careerField || careerField.trim().length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Career field wajib diisi'
        });
      }

      // Cek apakah CV review exists dan milik user
      const existingCVReview = await prisma.cVReview.findFirst({
        where: {
          id: id,
          userId: userId
        }
      });

      if (!existingCVReview) {
        return res.status(404).json({
          status: 'error',
          message: 'CV review tidak ditemukan'
        });
      }

      // Re-analisis CV dengan career field baru
      console.log(`Re-analyzing CV ${id} with new career field: ${careerField}`);
      const analysis = await aiService.analyzeCVWithAI(existingCVReview.extractedText, careerField);

      // Update CV review di database
      const updatedCVReview = await prisma.cVReview.update({
        where: { id: id },
        data: {
          careerField: careerField,
          
          // Update scoring dari AI analysis ulang
          relevancyRate: analysis.scores.relevancyRate || 0,
          targetedJobRate: analysis.scores.targetedJobRate || 0,
          overallScore: analysis.scores.overallScore || 0,
          relevantSkill: analysis.scores.relevantSkill || 0,
          workExperience: analysis.scores.workExperience || 0,
          consistency: analysis.scores.consistency || 0,
          writingQuality: analysis.scores.writingQuality || 0,
          
          // Update AI analysis & suggestions
          aiAnalysis: analysis.aiAnalysis || {},
          suggestions: analysis.suggestions || [],
          
          updatedAt: new Date()
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      return res.status(200).json({
        status: 'success',
        message: 'CV review berhasil diupdate dan dianalisis ulang!',
        data: {
          id: updatedCVReview.id,
          fileName: updatedCVReview.fileName,
          careerField: updatedCVReview.careerField,
          fileUrl: updatedCVReview.b2FileUrl,
          fileSize: updatedCVReview.fileSize,
          scores: {
            relevancyRate: updatedCVReview.relevancyRate,
            targetedJobRate: updatedCVReview.targetedJobRate,
            overallScore: updatedCVReview.overallScore,
            relevantSkill: updatedCVReview.relevantSkill,
            workExperience: updatedCVReview.workExperience,
            consistency: updatedCVReview.consistency,
            writingQuality: updatedCVReview.writingQuality
          },
          aiAnalysis: updatedCVReview.aiAnalysis,
          suggestions: updatedCVReview.suggestions,
          createdAt: updatedCVReview.createdAt,
          updatedAt: updatedCVReview.updatedAt
        }
      });

    } catch (error) {
      console.error('Error in updateCVReview:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat mengupdate CV review',
        error: error.message
      });
    }
  }

  /**
   * @swagger
   * /api/cv-review/{id}:
   *   delete:
   *     summary: Delete CV review
   *     tags: [CV Review]
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
   *         description: CV review berhasil dihapus
   *       404:
   *         description: CV review tidak ditemukan
   */
  static async deleteCVReview(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const cvReview = await prisma.cVReview.findFirst({
        where: {
          id: id,
          userId: userId
        }
      });

      if (!cvReview) {
        return res.status(404).json({
          status: 'error',
          message: 'CV review tidak ditemukan'
        });
      }

      // Delete file from B2 storage
      if (cvReview.b2FileId && cvReview.b2FileName) {
        try {
          await b2StorageService.deleteCV(cvReview.b2FileId, cvReview.b2FileName);
        } catch (error) {
          console.error('Error deleting file from B2:', error);
        }
      }

      // Delete local file (if exists)
      if (cvReview.filePath) {
        try {
          await fs.unlink(cvReview.filePath);
        } catch (error) {
          console.error('Error deleting local file:', error);
        }
      }

      // Delete from database
      await prisma.cVReview.delete({
        where: { id: id }
      });

      return res.status(200).json({
        status: 'success',
        message: 'CV review berhasil dihapus'
      });

    } catch (error) {
      console.error('Error in deleteCVReview:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat menghapus CV review',
        error: error.message
      });
    }
  }
}

module.exports = {
  CVReviewController,
  upload
}; 