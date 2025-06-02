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

// Helper untuk remove undefined/null values dari object
function cleanObject(obj, removeNull = false) {
  const cleaned = {};
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    if (value !== undefined && (!removeNull || value !== null)) {
      cleaned[key] = value;
    }
  });
  return cleaned;
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
function validateUserData(userData, options = {}) {
  const errors = [];
  const { skipEmail = false } = options; // Option untuk skip email validation
  
  // Validasi profilePicture (hanya kalau ada)
  if (userData.profilePicture !== undefined) {
    const profilePictureValidation = validateStringLength(
      userData.profilePicture, 
      DB_LIMITS.PROFILE_PICTURE, 
      'Profile picture URL'
    );
    if (!profilePictureValidation.valid) {
      errors.push(profilePictureValidation.error);
    }
  }
  
  // Validasi email (hanya kalau tidak di-skip dan ada)
  if (!skipEmail && userData.email !== undefined) {
    const emailValidation = validateStringLength(
      userData.email, 
      DB_LIMITS.EMAIL, 
      'Email'
    );
    if (!emailValidation.valid) {
      errors.push(emailValidation.error);
    }
  }
  
  // Validasi phoneNumber (hanya kalau ada)
  if (userData.phoneNumber !== undefined) {
    const phoneValidation = validateStringLength(
      userData.phoneNumber, 
      DB_LIMITS.PHONE_NUMBER, 
      'Phone number'
    );
    if (!phoneValidation.valid) {
      errors.push(phoneValidation.error);
    }
  }

  // Validasi firstName (hanya kalau ada)
  if (userData.firstName !== undefined) {
    const firstNameValidation = validateStringLength(
      userData.firstName, 
      DB_LIMITS.NAME, 
      'First name'
    );
    if (!firstNameValidation.valid) {
      errors.push(firstNameValidation.error);
    }
  }

  // Validasi lastName (hanya kalau ada)
  if (userData.lastName !== undefined) {
    const lastNameValidation = validateStringLength(
      userData.lastName, 
      DB_LIMITS.NAME, 
      'Last name'
    );
    if (!lastNameValidation.valid) {
      errors.push(lastNameValidation.error);
    }
  }

  // Validasi address (hanya kalau ada)
  if (userData.address !== undefined) {
    const addressValidation = validateStringLength(
      userData.address, 
      DB_LIMITS.ADDRESS, 
      'Address'
    );
    if (!addressValidation.valid) {
      errors.push(addressValidation.error);
    }
  }
  
  // Filter out undefined values untuk sanitized data
  const sanitizedData = {};
  Object.keys(userData).forEach(key => {
    if (userData[key] !== undefined) {
      sanitizedData[key] = userData[key];
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
    sanitizedData
  };
}

module.exports = {
  validateStringLength,
  validateUserData,
  cleanObject,
  DB_LIMITS
}; 