const prisma = require('../prisma/client');
/**
 * @swagger
 * components:
 *   schemas:
 *     Job:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID job
 *         title:
 *           type: string
 *           description: Judul pekerjaan
 *         company:
 *           type: string
 *           description: Nama perusahaan
 *         description:
 *           type: string
 *           description: Deskripsi pekerjaan
 *         requirements:
 *           type: object
 *           description: Requirements pekerjaan
 *         location:
 *           type: string
 *           description: Lokasi pekerjaan
 *         salaryRange:
 *           type: string
 *           description: Range gaji
 *         jobType:
 *           type: string
 *           description: Tipe pekerjaan (full-time, part-time, etc)
 *         category:
 *           type: string
 *           description: Kategori pekerjaan
 *         isActive:
 *           type: boolean
 *           description: Status aktif job
 *         createdAt:
 *           type: string
 *           format: date-time
 *     JobMatching:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID job matching
 *         dreamJob:
 *           type: string
 *           description: Pekerjaan impian user
 *         matches:
 *           type: array
 *           description: Hasil matching dengan jobs
 *         aiAnalysis:
 *           type: object
 *           description: Analisis AI
 *         createdAt:
 *           type: string
 *           format: date-time
 */

class JobMatchingController {
  /**
   * @swagger
   * /api/jobs:
   *   get:
   *     summary: Get all job listings
   *     tags: [JobMatching]
   *     parameters:
   *       - in: query
   *         name: category
   *         schema:
   *           type: string
   *         description: Filter berdasarkan kategori
   *       - in: query
   *         name: location
   *         schema:
   *           type: string
   *         description: Filter berdasarkan lokasi
   *       - in: query
   *         name: jobType
   *         schema:
   *           type: string
   *         description: Filter berdasarkan tipe pekerjaan
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Search berdasarkan title atau company
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *         description: Jumlah job per page
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           default: 0
   *         description: Offset untuk pagination
   *     responses:
   *       200:
   *         description: Daftar job berhasil diambil
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Job'
   *                 total:
   *                   type: integer
   *                 pagination:
   *                   type: object
   *       500:
   *         description: Server error
   */
  static async getJobs(req, res) {
    try {
      const { 
        category, 
        location, 
        jobType, 
        search,
        limit = 20,
        offset = 0 
      } = req.query;
      
      const whereClause = { isActive: true };
      
      // Filter berdasarkan query params
      if (category) {
        whereClause.category = { 
          contains: category
        };
      }
      if (location) {
        whereClause.location = { 
          contains: location
        };
      }
      if (jobType) {
        whereClause.jobType = jobType;
      }
      if (search) {
        whereClause.OR = [
          { title: { contains: search } },
          { company: { contains: search } }
        ];
      }
      
      const [jobs, total] = await Promise.all([
        prisma.job.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          take: parseInt(limit),
          skip: parseInt(offset),
          select: {
            id: true,
            title: true,
            company: true,
            description: true,
            requirements: true,
            location: true,
            salaryRange: true,
            jobType: true,
            category: true,
            createdAt: true
          }
        }),
        prisma.job.count({ where: whereClause })
      ]);
      
      return res.status(200).json({
        status: 'success',
        message: 'Daftar job berhasil diambil',
        data: jobs,
        total,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + parseInt(limit) < total
        }
      });
      
    } catch (error) {
      console.error('Error in getJobs:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan server',
        error: error.message
      });
    }
  }
  
  /**
   * @swagger
   * /api/jobs/{id}:
   *   get:
   *     summary: Get detail job by ID
   *     tags: [JobMatching]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Job ID
   *     responses:
   *       200:
   *         description: Detail job berhasil diambil
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   $ref: '#/components/schemas/Job'
   *       404:
   *         description: Job tidak ditemukan
   *       500:
   *         description: Server error
   */
  static async getJobDetail(req, res) {
    try {
      const jobId = req.params.id;
      
      const job = await prisma.job.findFirst({
        where: { 
          id: jobId,
          isActive: true 
        }
      });
      
      if (!job) {
        return res.status(404).json({
          status: 'error',
          message: 'Job tidak ditemukan'
        });
      }
      
      return res.status(200).json({
        status: 'success',
        message: 'Detail job berhasil diambil',
        data: job
      });
      
    } catch (error) {
      console.error('Error in getJobDetail:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan server',
        error: error.message
      });
    }
  }
  
  /**
   * @swagger
   * /api/job-matching/history:
   *   get:
   *     summary: Get job matching history untuk user
   *     tags: [JobMatching]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Job matching history berhasil diambil
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/JobMatching'
   *       500:
   *         description: Server error
   */
  static async getJobMatchingHistory(req, res) {
    try {
      const userId = req.user.id;
      
      const jobMatchings = await prisma.jobMatching.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          cvReview: {
            select: {
              fileName: true,
              careerField: true,
              overallScore: true
            }
          }
        }
      });
      
      return res.status(200).json({
        status: 'success',
        message: 'Job matching history berhasil diambil',
        data: jobMatchings,
        total: jobMatchings.length
      });
      
    } catch (error) {
      console.error('Error in getJobMatchingHistory:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan server',
        error: error.message
      });
    }
  }
  
  /**
   * @swagger
   * /api/job-matching/categories:
   *   get:
   *     summary: Get available job categories
   *     tags: [JobMatching]
   *     responses:
   *       200:
   *         description: Kategori job berhasil diambil
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   type: array
   *                   items:
   *                     type: string
   *       500:
   *         description: Server error
   */
  static async getJobCategories(req, res) {
    try {
      const categories = await prisma.job.findMany({
        where: { isActive: true },
        select: { category: true },
        distinct: ['category']
      });
      
      const categoryList = categories.map(c => c.category).filter(Boolean);
      
      return res.status(200).json({
        status: 'success',
        message: 'Kategori job berhasil diambil',
        data: categoryList
      });
      
    } catch (error) {
      console.error('Error in getJobCategories:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan server',
        error: error.message
      });
    }
  }
  
  /**
   * @swagger
   * /api/job-matching/match:
   *   post:
   *     summary: CV Job Matching dengan AI
   *     tags: [JobMatching]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               dreamJob:
   *                 type: string
   *                 description: Pekerjaan impian
   *                 example: "Software Engineer"
   *               cvReviewId:
   *                 type: string
   *                 description: ID CV Review (optional)
   *     responses:
   *       200:
   *         description: Job matching berhasil
   *       400:
   *         description: Data input tidak valid
   *       500:
   *         description: Server error
   */
  static async matchJobs(req, res) {
    try {
      const userId = req.user.id;
      
      // Debug logging
      console.log('Job matching request:', {
        body: req.body,
        headers: req.headers['content-type'],
        method: req.method,
        url: req.url
      });
      
      const { dreamJob, cvReviewId } = req.body || {};
      

      if (!dreamJob) {
        return res.status(400).json({
          status: 'error',
          message: 'Dream job wajib diisi'
        });
      }

      let cvReview = null;
      let extractedText = '';

      // Jika cvReviewId diberikan, ambil CV review data
      if (cvReviewId) {
        cvReview = await prisma.cVReview.findFirst({
          where: {
            id: cvReviewId,
            userId: userId
          }
        });

        if (!cvReview) {
          return res.status(400).json({
            status: 'error',
            message: 'CV Review tidak ditemukan'
          });
        }

        extractedText = cvReview.extractedText;
      }

      // Ambil semua active jobs
      const availableJobs = await prisma.job.findMany({
        where: { isActive: true },
        take: 50 // Limit untuk performa
      });

      if (availableJobs.length === 0) {
        return res.status(200).json({
          status: 'success',
          message: 'Belum ada job tersedia saat ini',
          data: {
            matches: [],
            aiAnalysis: {
              summary: 'Belum ada job tersedia untuk dianalisis'
            }
          }
        });
      }

      // Lakukan job matching dengan AI
      const aiService = require('../services/ai_service');
      const matchingResult = await aiService.performJobMatching(
        extractedText, 
        dreamJob, 
        availableJobs
      );

      // Simpan hasil matching ke database
      const jobMatching = await prisma.jobMatching.create({
        data: {
          userId: userId,
          cvReviewId: cvReviewId || null,
          dreamJob: dreamJob,
          matches: matchingResult.matches || [],
          aiAnalysis: matchingResult.aiAnalysis || {}
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          cvReview: cvReviewId ? {
            select: {
              fileName: true,
              careerField: true,
              overallScore: true
            }
          } : false
        }
      });

      return res.status(200).json({
        status: 'success',
        message: 'Job matching berhasil dilakukan!',
        data: {
          id: jobMatching.id,
          dreamJob: jobMatching.dreamJob,
          matches: jobMatching.matches,
          aiAnalysis: jobMatching.aiAnalysis,
          cvReview: jobMatching.cvReview,
          createdAt: jobMatching.createdAt,
          totalMatches: Array.isArray(jobMatching.matches) ? jobMatching.matches.length : 0
        }
      });

    } catch (error) {
      console.error('Error in matchJobs:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat melakukan job matching',
        error: error.message
      });
    }
  }
}

module.exports = JobMatchingController; 