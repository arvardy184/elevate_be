const uploadProfileImage = require("../utils/fileUploader");
const prisma = require('../prisma/client');

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


exports.updateProfile = async (req, res) => {
  try{
    const userId = req.user.id;
    const { firstName, lastName, address, phoneNumber, gender, birthDate } = req.body;

    const existing = await prisma.user.findUnique({
      where: { id: userId },
    });
    if(!existing){
      return res.status(404).json({
        message: 'User tidak ditemukan!',
      });
    }// end if

    

    //handle foto
    let profilePicture = existing.profilePicture;
    if(req.file){
      profilePicture = await uploadProfileImage(req.file);
    }
    const updatedUser = await prisma.user.update({
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
      },
      select:{
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
  } catch(e){
    console.error(e);
    return res.status(500).json({
      message: 'Terjadi kesalahan server.',
    })
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
  