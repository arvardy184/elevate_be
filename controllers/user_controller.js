// controllers/user.controller.js

exports.getProfile = (req, res) => {
    // req.user di-set di middleware JWT
    const user = req.user; 
    return res.status(200).json({
      message: 'Profile user berhasil diakses!',
      user
    });
  };
  