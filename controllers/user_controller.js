const uploadProfileImage = require("../utils/fileUploader");

exports.getProfile = (req, res) => {
    // req.user di-set di middleware JWTaaa
    const user = req.user; 
    return res.status(200).json({
      message: 'Profile user berhasil diakses!',
      user
    });
  };

exports.updateProfile =async (req, res) => {
  const { firstName, lastName, email, address, phoneNumber, gender, birthDate } = req.body;
  const userId = req.user.id;

  const user = await Prisma.user.findUnique({
    where: { id: userId },
  });

  if(!user){
    return res.status(404).json({
      message: 'User tidak ditemukan!',
    });
  }

  let profilePicture = user.profilePicture;
  if(req.file){
    profilePicture = await uploadProfileImage(req.file);
  }
  const updatedUser = await Prisma.user.update({
    where: { id: userId },
    data: {
      firstName,
      lastName,
      email,
      address,
      phoneNumber,
      gender,
      birthDate,
      profilePicture 
    }
  });

  
    return res.status(200).json({
      message: 'Profile user berhasil diupdate!',
      user: updatedUser
    });
  };
  