// Validasi panjang string untuk kolom database
function validateStringLength(value, maxLength, fieldName = 'field') {
  if (!value) return { valid: true, value: null };
  
  if (typeof value !== 'string') {
    return { 
      valid: false, 
      error: `${fieldName} harus berupa string`,
      value: null 
    };
  }
  
  if (value.length > maxLength) {
    return { 
      valid: false, 
      error: `${fieldName} terlalu panjang (maksimal ${maxLength} karakter, sekarang ${value.length})`,
      value: null 
    };
  }
  
  return { valid: true, value };
}

// Konstanta untuk maksimal length sesuai schema
const DB_LIMITS = {
  PROFILE_PICTURE: 512,
  EMAIL: 191,
  PHONE_NUMBER: 20,
  NAME: 100,
  ADDRESS: 255
};

// Helper untuk validasi user update data
function validateUserData(userData) {
  const errors = [];
  
  // Validasi profilePicture
  const profilePictureValidation = validateStringLength(
    userData.profilePicture, 
    DB_LIMITS.PROFILE_PICTURE, 
    'Profile picture URL'
  );
  if (!profilePictureValidation.valid) {
    errors.push(profilePictureValidation.error);
  }
  
  // Validasi email
  const emailValidation = validateStringLength(
    userData.email, 
    DB_LIMITS.EMAIL, 
    'Email'
  );
  if (!emailValidation.valid) {
    errors.push(emailValidation.error);
  }
  
  // Validasi phoneNumber
  const phoneValidation = validateStringLength(
    userData.phoneNumber, 
    DB_LIMITS.PHONE_NUMBER, 
    'Phone number'
  );
  if (!phoneValidation.valid) {
    errors.push(phoneValidation.error);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    sanitizedData: {
      ...userData,
      profilePicture: profilePictureValidation.value,
      email: emailValidation.value,
      phoneNumber: phoneValidation.value
    }
  };
}

module.exports = {
  validateStringLength,
  validateUserData,
  DB_LIMITS
}; 