const { uploadMiddleware, uploadToStorage, FileCategory } = require("../utils/fileUploader");
const { generateSignedUrl } = require("../utils/storage");
const prisma = require('../prisma/client');
const { parseBirthDate } = require('../utils/dateParser');
const { validateUserData, DB_LIMITS } = require('../utils/validationUtils');
/**
 * @swagger
 * components:
 *   schemas:
 *     UserProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID unik user
 *         firstName:
 *           type: string
 *           description: Nama depan user
 *         lastName:
 *           type: string
 *           description: Nama belakang user
 *         email:
 *           type: string
 *           format: email
 *           description: Email user
 *         address:
 *           type: string
 *           description: Alamat user
 *         phoneNumber:
 *           type: string
 *           description: Nomor telepon user
 *         gender:
 *           type: string
 *           enum: [male, female, other]
 *           description: Jenis kelamin user
 *         birthDate:
 *           type: string
 *           format: date
 *           description: Tanggal lahir user
 *         profilePicture:
 *           type: string
 *           description: URL foto profil user
 *         role:
 *           type: string
 *           enum: [user, admin]
 *           description: Role user
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Waktu pembuatan akun
 *     UpdateProfileRequest:
 *       type: object
 *       properties:
 *         firstName:
 *           type: string
 *           description: Nama depan user
 *         lastName:
 *           type: string
 *           description: Nama belakang user
 *         address:
 *           type: string
 *           description: Alamat user
 *         phoneNumber:
 *           type: string
 *           description: Nomor telepon user
 *         gender:
 *           type: string
 *           enum: [male, female, other]
 *           description: Jenis kelamin user
 *         birthDate:
 *           type: string
 *           format: date
 *           description: Tanggal lahir user
 */

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Ambil profil user yang sedang login
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil user berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Profile user berhasil diakses!
 *                 user:
 *                   $ref: '#/components/schemas/UserProfile'
 *       401:
 *         description: Unauthorized - Token tidak valid
 *       404:
 *         description: User tidak ditemukan
 *       500:
 *         description: Server error
 */
exports.getProfile = async (req, res) => {
  try{
    const userId = req.user.id;
    const user = await prisma.user.findUnique
    ({
      where: { id: userId },
      select: {
        id: true, 
        firstName: true,
        lastName: true,
        email: true,
        address: true,
        phoneNumber: true,
        gender: true,
        birthDate: true,
        profilePicture: true,
        role: true,
        createdAt: true
      }
    });
    if(!user){
      return res.status(404).json({
        message: 'User tidak ditemukan!',
      });
    }
    
    // Generate signed URL untuk profile picture jika ada
    if (user.profilePicture && user.profilePicture.includes('elevate-be/')) {
      try {
        // Extract filename from URL
        const fileName = user.profilePicture.split('/file/elevate-be/')[1];
        if (fileName) {
          const signedUrl = await generateSignedUrl(fileName, 24 * 3600); // 24 hours
          user.profilePicture = signedUrl;
          console.log('[getProfile] Generated signed URL for existing profile picture');
        }
      } catch (error) {
        console.error('[getProfile] Error generating signed URL:', error);
        // Keep original URL if signing fails
      }
    }
    
    return res.status(200).json({
      message: 'Profile user berhasil diakses!',
      user
    });
  } catch(e){
console.error(e);
return res.status(500).json({message: "Terjadi kesalahan server."});
  }
}
// exports.getProfile = (req, res) => {
//     // req.user di-set di middleware JWTaaa
//     const user = req.user; 
//     return res.status(200).json({
//       message: 'Profile user berhasil diakses!',
//       user
//     });
//   };


/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update profil user yang sedang login
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               address:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *               birthDate:
 *                 type: string
 *                 format: date
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profil user berhasil diupdate
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Profile user berhasil diupdate!
 *                 updatedUser:
 *                   $ref: '#/components/schemas/UserProfile'
 *       400:
 *         description: Bad request - Gagal upload foto profil
 *       401:
 *         description: Unauthorized - Token tidak valid
 *       404:
 *         description: User tidak ditemukan
 *       500:
 *         description: Server error
 */
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, address, phoneNumber, gender, birthDate } = req.body;

    const existing = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if(!existing) {
      return res.status(404).json({
        message: 'User tidak ditemukan!',
      });
    }

    // Handle foto profile
    let profilePicture = existing.profilePicture;
    if(req.file) {
      try {
        // Validate file exists sebelum upload
        const fs = require('fs');
        if (!fs.existsSync(req.file.path)) {
          console.error('[updateProfile] File not found:', req.file.path);
          return res.status(400).json({
            message: 'File upload gagal. Silakan coba lagi.'
          });
        }

        const uploadResult = await uploadToStorage(req.file, FileCategory.PROFILE_PICTURE);
        console.log('[updateProfile] Upload result:', uploadResult);
        
        // Generate signed URL untuk private bucket access (expires in 24 hours)
        const fileName = uploadResult.data.fileName;
        const signedUrl = await generateSignedUrl(fileName, 24 * 3600); // 24 hours
        console.log('[updateProfile] Generated signed URL:', signedUrl);
        
        // Validasi panjang URL sebelum simpan ke DB
        const MAX_URL_LENGTH = 191; // TEMPORARY: sesuai dengan varchar(191) di production
        if (signedUrl && signedUrl.length > MAX_URL_LENGTH) {
          console.warn(`[updateProfile] Signed URL too long: ${signedUrl.length} chars. Using fileName instead.`);
          // Fallback: simpan nama file aja, nanti generate signed URL saat diambil
          profilePicture = `elevate-be/${fileName}`;
        } else {
          profilePicture = signedUrl;
        }
        
        console.log(`[updateProfile] Final profilePicture length: ${profilePicture?.length || 0} chars`);
        
      } catch (error) {
        console.error('[updateProfile] Error uploading profile picture:', error);
        return res.status(400).json({
          message: 'Gagal upload foto profile. Silakan coba lagi. Detail: ' + error.message
        });
      }
    }

    const parsedBirthDate = parseBirthDate(birthDate);
    if(!parsedBirthDate && birthDate){
      return res.status(400).json({
        message: 'Format tanggal lahir tidak valid. Gunakan format DD/MM/YYYY atau DD-MM-YYYY.'
      });
    }

    // Validasi semua data sebelum update ke database
    const updateData = {
      firstName,
      lastName,
      address,
      phoneNumber,
      gender,
      birthDate: parsedBirthDate,
      profilePicture 
    };

    console.log('[updateProfile] Raw updateData:', updateData);

    const validation = validateUserData(updateData, { skipEmail: true });
    if (!validation.valid) {
      console.error('[updateProfile] Validation errors:', validation.errors);
      return res.status(400).json({
        message: 'Data tidak valid: ' + validation.errors.join(', ')
      });
    }

    console.log('[updateProfile] Sanitized data:', validation.sanitizedData);
    console.log(`[updateProfile] All validations passed. profilePicture length: ${profilePicture?.length || 0}`);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: validation.sanitizedData,
      select: {
        id: true, 
        firstName: true,
        lastName: true,
        address: true,
        phoneNumber: true,
        gender: true,
        birthDate: true,
        profilePicture: true,
        role: true,
        createdAt: true
      }
    });

    return res.status(200).json({
      message: 'Profile user berhasil diupdate!',
      updatedUser
    });
  } catch(e) {
    console.error('[updateProfile] Server error:', e);
    return res.status(500).json({
      message: 'Terjadi kesalahan server.',
    });
  }
}

/**
 * @swagger
 * /api/users/notifications:
 *   get:
 *   summary: Ambil semua notifikasi user
 *   tags: [Users]
 *   security:
 *     - bearerAuth: []
 *   responses:
 *     200:
 *       description: Notifikasi berhasil diambil
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:    
 *               message:
 *                 type: string
 *                 example: Notifikasi berhasil diambil!
 *               notifications:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Notification'
 *     401:
 *       description: Unauthorized - Token tidak valid
 *     404:
 *       description: User tidak ditemukan
 *     500:
 */ 
exports.getUserNotifications = async(req,res) => {
  try{
    const userId = req.user.id;
    const notifications = await prisma.notification.findMany({
      where: {
        userId
      },
      orderBy:{
        createdAt: 'desc'
      }
    });
    return res.status(200).json({
      message: 'Notifikasi berhasil diambil!',
      notifications
    });
  } catch(e){
    console.error(e);
    return res.status(500).json({
      message: 'Terjadi kesalahan server.',
    });
  }
}

/**
 * @swagger
 * /api/users/notifications/{id}:
 *   put:
 *   summary: Update status notifikasi
 *   tags: [Users]
 *   security:  
 *     - bearerAuth: []
 *   parameters:
 *     - name: id
 *       in: path
 *       required: true
 *       type: string
 *   responses:
 *     200:
 *       description: Notifikasi berhasil diupdate
 *     401:
 *       description: Unauthorized - Token tidak valid
 *     404:
 *       description: Notifikasi tidak ditemukan  
 *     500:
 */
exports.updateNotificationStatus = async(req,res) => {
  try{
    const {id} = req.params;
    const {isRead} = req.body;

    const updatedNotification = await prisma.notification.update({
      where: {id},
      data: {isRead}
    });
    
    return res.status(200).json({
      message: 'Notifikasi berhasil diupdate!',
      updatedNotification
    });
  } catch(e){
    console.error(e);
    return res.status(500).json({
      message: 'Terjadi kesalahan server.', 
    });
  }
}

/**
 * @swagger
 * /api/users/notifications/{id}:
 *   get:
 *   summary: Ambil detail notifikasi
 *   tags: [Users]
 *   security:
 *     - bearerAuth: []
 *   parameters:
 *     - name: id   
 *       in: path
 *       required: true
 *       type: string
 *   responses:
 *     200:
 *       description: Notifikasi berhasil diambil
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: Notifikasi berhasil diambil!
 *               notification:
 *                 $ref: '#/components/schemas/Notification'
 */
exports.getNotificationDetail = async(req,res) => {
  try{
    const userId = req.user.id;
    const notifId = parseInt(req.params.id);

    const notif = await prisma.notification.findUnique({
      where: {
        id: notifId,
        
      }
    });

    
    if(!notif || notif.userId !== userId    ){
      return res.status(404).json({
        success: false,
        message: 'Notifikasi tidak ditemukan!',
      });
    }

    return res.status(200).json({
      message: 'Notifikasi berhasil diambil!',
      notif
    });
  } catch(e){
    console.error(e);
    return res.status(500).json({
      message: 'Terjadi kesalahan server.',
    });
  }
} 





// exports.updateProfile =async (req, res) => {
//   const { firstName, lastName, email, address, phoneNumber, gender, birthDate } = req.body;
//   const userId = req.user.id;

//   const user = await Prisma.user.findUnique({
//     where: { id: userId },
//   });

//   if(!user){
//     return res.status(404).json({
//       message: 'User tidak ditemukan!',
//     });
//   }

//   let profilePicture = user.profilePicture;
//   if(req.file){
//     profilePicture = await uploadProfileImage(req.file);
//   }
//   const updatedUser = await Prisma.user.update({
//     where: { id: userId },
//     data: {
//       firstName,
//       lastName,
//       email,
//       address,
//       phoneNumber,
//       gender,
//       birthDate,
//       profilePicture 
//     }
//   });

  
//     return res.status(200).json({
//       message: 'Profile user berhasil diupdate!',
//       user: updatedUser
//     });
//   };
  

