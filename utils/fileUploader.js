const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../public/uploads'));
    },
    filename: (req, file, cb) => {
        const fileExt = path.extname(file.originalname);
        cb(null, `${Date.now()}${fileExt}`);
    }
});

//filter untuk tipe file yang diizinkan 
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['images/jpeg', 'images/png', 'images/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type'), false);
      }

};

const uploadProfileImage = multer({ storage, fileFilter}).single('profileImage');

module.exports = uploadProfileImage;