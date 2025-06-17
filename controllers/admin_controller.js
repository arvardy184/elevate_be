const prisma = require('../prisma/client');
const fs = require('fs');
const path = require('path');
const b2StorageService = require('../services/b2_storage_service');


// ===== DASHBOARD & ANALYTICS =====
exports.getDashboard = async (req, res) => {
  try {
    // Get basic stats
    const [totalUsers, totalCourses, totalRoadmaps, totalEnrollments] = await Promise.all([
      prisma.user.count(),
      prisma.course.count(),
      prisma.roadmap.count(),
      prisma.enrollment.count()
    ]);

    // Get recent activity
    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    const recentEnrollments = await prisma.enrollment.findMany({
      take: 5,
      orderBy: { enrolledAt: 'desc' },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        course: {
          select: {
            title: true
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalCourses,
          totalRoadmaps,
          totalEnrollments
        },
        recentActivity: {
          recentUsers,
          recentEnrollments
        }
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data dashboard',
      error: error.message
    });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    // User analytics by role
    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: { role: true }
    });

    // Course analytics
    const coursesByCategory = await prisma.course.findMany({
      include: {
        category: {
          select: {
            name: true
          }
        },
        _count: {
          select: {
            enrollment: true
          }
        }
      }
    });

    // Monthly enrollment trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const enrollmentTrends = await prisma.enrollment.findMany({
      where: {
        enrolledAt: {
          gte: sixMonthsAgo
        }
      },
      select: {
        enrolledAt: true
      }
    });

    // Group enrollments by month
    const monthlyEnrollments = enrollmentTrends.reduce((acc, enrollment) => {
      const month = enrollment.enrolledAt.toISOString().substr(0, 7); // YYYY-MM
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        usersByRole,
        coursesByCategory,
        enrollmentTrends: monthlyEnrollments
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data analytics',
      error: error.message
    });
  }
};

// ===== USER MANAGEMENT =====
exports.getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const role = req.query.role || '';
    const skip = (page - 1) * limit;

    const where = {
      ...(search && {
        OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { email: { contains: search } }
        ]
      }),
      ...(role && { role })
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          role: true,
          createdAt: true,
          _count: {
            select: {
              enrollment: true
            }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data users',
      error: error.message
    });
  }
};

exports.getUserDetail = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        enrollment: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                thumbnail: true
              }
            }
          }
        },
        _count: {
          select: {
            enrollment: true,
            payment: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get user detail error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail user',
      error: error.message
    });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const userId = req.params.id;
    const { role } = req.body;

    if (!['USER', 'CONSULTANT', 'ADMIN'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role tidak valid'
      });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true
      }
    });

    res.status(200).json({
      success: true,
      message: 'Role user berhasil diupdate',
      data: { user }
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate role user',
      error: error.message
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    // Don't allow deleting admin users
    if (user.role === 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Tidak dapat menghapus user admin'
      });
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    res.status(200).json({
      success: true,
      message: 'User berhasil dihapus'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus user',
      error: error.message
    });
  }
};

// ===== COURSE MANAGEMENT =====
exports.getCourses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const categoryId = req.query.categoryId ? parseInt(req.query.categoryId) : null;
    const skip = (page - 1) * limit;

    const where = {
      ...(search && {
        OR: [
          { title: { contains: search } },
          { description: { contains: search } }
        ]
      }),
      ...(categoryId && { categoryId })
    };

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: {
            select: {
              name: true
            }
          },
          users: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          _count: {
            select: {
              enrollment: true,
              lesson: true,
              coursevideo: true
            }
          }
        }
      }),
      prisma.course.count({ where })
    ]);

    res.status(200).json({
      success: true,
      data: {
        courses,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data courses',
      error: error.message
    });
  }
};

exports.createCourse = async (req, res) => {
  try {
    const { title, description, categoryId, isPaid, price } = req.body;

    if (!title || !description || !categoryId) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, dan categoryId wajib diisi'
      });
    }

    let thumbnailUrl = '';
    let b2FileId = null;
    let b2FileName = null;
    let b2ThumbnailUrl = null;

    // Upload thumbnail to B2 if provided
    if (req.file) {
      try {
        const b2Upload = await b2StorageService.uploadCourseThumbnail(
          req.file.path,
          req.file.originalname,
          `course-${Date.now()}`
        );

        if (b2Upload.success) {
          // Instead of using the direct URL (which gives 401), generate authorized URL
          console.log('🔐 Generating authorized URL for thumbnail...');
          const authorizedResult = await b2StorageService.generateThumbnailUrl(b2Upload.fileName);
          
          if (authorizedResult.success) {
            thumbnailUrl = authorizedResult.url;
            b2ThumbnailUrl = authorizedResult.url;
            console.log('✅ Authorized URL generated:', {
              url: authorizedResult.url,
              expiresAt: authorizedResult.expiresAt
            });
          } else {
            console.error('❌ Failed to generate authorized URL, using fallback:', authorizedResult.error);
            // Fallback to original URL
            thumbnailUrl = b2Upload.url;
            b2ThumbnailUrl = b2Upload.url;
          }
          
          b2FileId = b2Upload.fileId;
          b2FileName = b2Upload.fileName;
          
          // Delete local temp file
          fs.unlinkSync(req.file.path);
        } else {
          console.error('B2 upload failed:', b2Upload.error);
          // Fallback to local file if B2 fails
          thumbnailUrl = req.file.filename;
        }
      } catch (uploadError) {
        console.error('Error uploading thumbnail to B2:', uploadError);
        // Fallback to local file if B2 fails
        thumbnailUrl = req.file.filename;
      }
    }

    const course = await prisma.course.create({
      data: {
        title,
        description,
        thumbnail: thumbnailUrl,
        categoryId: parseInt(categoryId),
        isPaid: isPaid === 'true',
        price: parseInt(price) || 0,
        createdById: req.user.id,
        // Store B2 info if uploaded to B2
        ...(b2FileId && {
          b2FileId,
          b2FileName,
          b2ThumbnailUrl
        })
      },
      include: {
        category: {
          select: {
            name: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Course berhasil dibuat',
      data: { course }
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal membuat course',
      error: error.message
    });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const courseId = parseInt(req.params.id);
    const { title, description, categoryId, isPaid, price } = req.body;

    const updateData = {
      ...(title && { title }),
      ...(description && { description }),
      ...(categoryId && { categoryId: parseInt(categoryId) }),
      ...(isPaid !== undefined && { isPaid: isPaid === 'true' }),
      ...(price !== undefined && { price: parseInt(price) })
    };

    // Handle thumbnail update if provided
    if (req.file) {
      try {
        const b2Upload = await b2StorageService.uploadCourseThumbnail(
          req.file.path,
          req.file.originalname,
          `course-${courseId}`
        );

        if (b2Upload.success) {
          updateData.thumbnail = b2Upload.url;
          updateData.b2FileId = b2Upload.fileId;
          updateData.b2FileName = b2Upload.fileName;
          updateData.b2ThumbnailUrl = b2Upload.url;
          
          // Delete local temp file
          fs.unlinkSync(req.file.path);
        } else {
          console.error('B2 upload failed:', b2Upload.error);
          // Fallback to local file if B2 fails
          updateData.thumbnail = req.file.filename;
        }
      } catch (uploadError) {
        console.error('Error uploading thumbnail to B2:', uploadError);
        // Fallback to local file if B2 fails
        updateData.thumbnail = req.file.filename;
      }
    }

    const course = await prisma.course.update({
      where: { id: courseId },
      data: updateData,
      include: {
        category: {
          select: {
            name: true
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      message: 'Course berhasil diupdate',
      data: { course }
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate course',
      error: error.message
    });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const courseId = parseInt(req.params.id);

    // Check if course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course tidak ditemukan'
      });
    }

    // Delete course thumbnail if exists
    if (course.thumbnail && course.thumbnail !== '') {
      const thumbnailPath = path.join(__dirname, '../uploads/courses', course.thumbnail);
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
      }
    }

    await prisma.course.delete({
      where: { id: courseId }
    });

    res.status(200).json({
      success: true,
      message: 'Course berhasil dihapus'
    });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus course',
      error: error.message
    });
  }
};

// ===== LESSON MANAGEMENT =====
exports.createLesson = async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    const { title, content, order } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title dan content wajib diisi'
      });
    }

    const lesson = await prisma.lesson.create({
      data: {
        title,
        content,
        order: parseInt(order) || 1,
        courseId
      }
    });

    res.status(201).json({
      success: true,
      message: 'Lesson berhasil dibuat',
      data: { lesson }
    });
  } catch (error) {
    console.error('Create lesson error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal membuat lesson',
      error: error.message
    });
  }
};

exports.updateLesson = async (req, res) => {
  try {
    const lessonId = parseInt(req.params.lessonId);
    const { title, content, order } = req.body;

    const updateData = {
      ...(title && { title }),
      ...(content && { content }),
      ...(order && { order: parseInt(order) })
    };

    const lesson = await prisma.lesson.update({
      where: { id: lessonId },
      data: updateData
    });

    res.status(200).json({
      success: true,
      message: 'Lesson berhasil diupdate',
      data: { lesson }
    });
  } catch (error) {
    console.error('Update lesson error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate lesson',
      error: error.message
    });
  }
};

exports.deleteLesson = async (req, res) => {
  try {
    const lessonId = parseInt(req.params.lessonId);

    await prisma.lesson.delete({
      where: { id: lessonId }
    });

    res.status(200).json({
      success: true,
      message: 'Lesson berhasil dihapus'
    });
  } catch (error) {
    console.error('Delete lesson error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus lesson',
      error: error.message
    });
  }
};

// ===== VIDEO MANAGEMENT =====
exports.uploadCourseVideo = async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    const { title, description, order } = req.body;
    const videoFile = req.file;

    if (!videoFile) {
      return res.status(400).json({
        success: false,
        message: 'File video wajib diupload'
      });
    }

    const video = await prisma.coursevideo.create({
      data: {
        title: title || 'Untitled Video',
        description: description || '',
        videoUrl: videoFile.filename,
        order: parseInt(order) || 1,
        courseId
      }
    });

    res.status(201).json({
      success: true,
      message: 'Video berhasil diupload',
      data: { video }
    });
  } catch (error) {
    console.error('Upload video error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengupload video',
      error: error.message
    });
  }
};

exports.deleteCourseVideo = async (req, res) => {
  try {
    const videoId = parseInt(req.params.videoId);

    const video = await prisma.coursevideo.findUnique({
      where: { id: videoId }
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video tidak ditemukan'
      });
    }

    // Delete video file
    if (video.videoUrl) {
      const videoPath = path.join(__dirname, '../uploads/videos', video.videoUrl);
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }
    }

    await prisma.coursevideo.delete({
      where: { id: videoId }
    });

    res.status(200).json({
      success: true,
      message: 'Video berhasil dihapus'
    });
  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus video',
      error: error.message
    });
  }
};

// ===== ROADMAP MANAGEMENT =====
exports.getRoadmaps = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    const where = {
      ...(search && {
        OR: [
          { name: { contains: search } },
          { description: { contains: search } }
        ]
      })
    };

    const [roadmaps, total] = await Promise.all([
      prisma.roadmap.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
        include: {
          _count: {
            select: {
              roadmapcourse: true,
              userroadmap: true
            }
          }
        }
      }),
      prisma.roadmap.count({ where })
    ]);

    res.status(200).json({
      success: true,
      data: {
        roadmaps,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    console.error('Get roadmaps error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data roadmaps',
      error: error.message
    });
  }
};

exports.createRoadmap = async (req, res) => {
  try {
    const { name, description, rewardVoucher } = req.body;

    if (!name || !description) {
      return res.status(400).json({
        success: false,
        message: 'Name dan description wajib diisi'
      });
    }

    const roadmap = await prisma.roadmap.create({
      data: {
        name,
        description,
        rewardVoucher: rewardVoucher || ''
      }
    });

    res.status(201).json({
      success: true,
      message: 'Roadmap berhasil dibuat',
      data: { roadmap }
    });
  } catch (error) {
    console.error('Create roadmap error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal membuat roadmap',
      error: error.message
    });
  }
};

exports.updateRoadmap = async (req, res) => {
  try {
    const roadmapId = parseInt(req.params.id);
    const { name, description, rewardVoucher } = req.body;

    const updateData = {
      ...(name && { name }),
      ...(description && { description }),
      ...(rewardVoucher !== undefined && { rewardVoucher })
    };

    const roadmap = await prisma.roadmap.update({
      where: { id: roadmapId },
      data: updateData
    });

    res.status(200).json({
      success: true,
      message: 'Roadmap berhasil diupdate',
      data: { roadmap }
    });
  } catch (error) {
    console.error('Update roadmap error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate roadmap',
      error: error.message
    });
  }
};

exports.deleteRoadmap = async (req, res) => {
  try {
    const roadmapId = parseInt(req.params.id);

    await prisma.roadmap.delete({
      where: { id: roadmapId }
    });

    res.status(200).json({
      success: true,
      message: 'Roadmap berhasil dihapus'
    });
  } catch (error) {
    console.error('Delete roadmap error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus roadmap',
      error: error.message
    });
  }
};

exports.addCourseToRoadmap = async (req, res) => {
  try {
    const roadmapId = parseInt(req.params.roadmapId);
    const { courseId, order } = req.body;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'CourseId wajib diisi'
      });
    }

    // Check if course already exists in roadmap
    const existing = await prisma.roadmapCourse.findFirst({
      where: {
        roadmapId,
        courseId: parseInt(courseId)
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Course sudah ada di roadmap'
      });
    }

    const roadmapCourse = await prisma.roadmapCourse.create({
      data: {
        roadmapId,
        courseId: parseInt(courseId),
        order: parseInt(order) || 1
      },
      include: {
        course: {
          select: {
            title: true,
            description: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Course berhasil ditambahkan ke roadmap',
      data: { roadmapCourse }
    });
  } catch (error) {
    console.error('Add course to roadmap error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menambahkan course ke roadmap',
      error: error.message
    });
  }
};

exports.removeCourseFromRoadmap = async (req, res) => {
  try {
    const roadmapId = parseInt(req.params.roadmapId);
    const courseId = parseInt(req.params.courseId);

    await prisma.roadmapCourse.deleteMany({
      where: {
        roadmapId,
        courseId
      }
    });

    res.status(200).json({
      success: true,
      message: 'Course berhasil dihapus dari roadmap'
    });
  } catch (error) {
    console.error('Remove course from roadmap error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus course dari roadmap',
      error: error.message
    });
  }
};

// ===== CATEGORY MANAGEMENT =====
exports.getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: {
            course: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.status(200).json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data categories',
      error: error.message
    });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name wajib diisi'
      });
    }

    const category = await prisma.category.create({
      data: {
        name
      }
    });

    res.status(201).json({
      success: true,
      message: 'Category berhasil dibuat',
      data: { category }
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal membuat category',
      error: error.message
    });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name wajib diisi'
      });
    }

    const category = await prisma.category.update({
      where: { id: categoryId },
      data: { name }
    });

    res.status(200).json({
      success: true,
      message: 'Category berhasil diupdate',
      data: { category }
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate category',
      error: error.message
    });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);

    // Check if category has courses
    const courseCount = await prisma.course.count({
      where: { categoryId }
    });

    if (courseCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat menghapus category yang masih memiliki course'
      });
    }

    await prisma.category.delete({
      where: { id: categoryId }
    });

    res.status(200).json({
      success: true,
      message: 'Category berhasil dihapus'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus category',
      error: error.message
    });
  }
};

// ===== B2 FILE TEST =====
exports.testB2FileAccess = async (req, res) => {
  try {
    const { fileId, fileName } = req.query;
    
    if (!fileId || !fileName) {
      return res.status(400).json({
        success: false,
        message: 'fileId dan fileName wajib diisi'
      });
    }
    
    const result = await b2StorageService.testFileAccess(fileId, fileName);
    
    res.status(200).json({
      success: true,
      message: 'File access test completed',
      data: result
    });
  } catch (error) {
    console.error('Test B2 file access error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal test file access',
      error: error.message
    });
  }
};

// ===== REFRESH AUTHORIZED URLS =====
exports.refreshAuthorizedUrls = async (req, res) => {
  try {
    console.log('🔐 Refreshing authorized URLs for all courses...');
    
    // Get all courses with B2 files
    const courses = await prisma.course.findMany({
      where: {
        b2FileName: {
          not: null
        }
      },
      select: {
        id: true,
        title: true,
        b2FileName: true,
        b2FileId: true,
        thumbnail: true
      }
    });
    
    console.log(`📋 Found ${courses.length} courses with B2 files`);
    
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (const course of courses) {
      try {
        console.log(`🔄 Processing course: ${course.title} (ID: ${course.id})`);
        
        // Generate new authorized URL
        const authorizedResult = await b2StorageService.generateThumbnailUrl(course.b2FileName);
        
        if (authorizedResult.success) {
          // Update course with new authorized URL
          await prisma.course.update({
            where: { id: course.id },
            data: {
              thumbnail: authorizedResult.url,
              b2ThumbnailUrl: authorizedResult.url
            }
          });
          
          results.push({
            courseId: course.id,
            courseTitle: course.title,
            status: 'success',
            newUrl: authorizedResult.url,
            expiresAt: authorizedResult.expiresAt
          });
          
          successCount++;
          console.log(`✅ Updated course ${course.id} with new authorized URL`);
        } else {
          results.push({
            courseId: course.id,
            courseTitle: course.title,
            status: 'error',
            error: authorizedResult.error
          });
          
          errorCount++;
          console.log(`❌ Failed to generate URL for course ${course.id}: ${authorizedResult.error}`);
        }
        
      } catch (courseError) {
        results.push({
          courseId: course.id,
          courseTitle: course.title,
          status: 'error',
          error: courseError.message
        });
        
        errorCount++;
        console.error(`❌ Error processing course ${course.id}:`, courseError.message);
      }
    }
    
    console.log(`🏁 Refresh completed: ${successCount} success, ${errorCount} errors`);
    
    res.status(200).json({
      success: true,
      message: 'Authorized URLs refresh completed',
      data: {
        summary: {
          totalCourses: courses.length,
          successCount,
          errorCount
        },
        results
      }
    });
    
  } catch (error) {
    console.error('Refresh authorized URLs error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal refresh authorized URLs',
      error: error.message
    });
  }
}; 