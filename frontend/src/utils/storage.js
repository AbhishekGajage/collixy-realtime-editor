// Store registration data temporarily (for auto-fill)
export const storeRegistrationData = (email, username) => {
  const registrationData = {
    email,
    username,
    timestamp: Date.now()
  };
  localStorage.setItem('recentRegistration', JSON.stringify(registrationData));
  
  // Set expiry after 5 minutes
  setTimeout(() => {
    localStorage.removeItem('recentRegistration');
  }, 5 * 60 * 1000);
};

// Get registration data
export const getRegistrationData = () => {
  const data = localStorage.getItem('recentRegistration');
  if (!data) return null;
  
  const registrationData = JSON.parse(data);
  const now = Date.now();
  
  // Check if data is still valid (within 5 minutes)
  if (now - registrationData.timestamp > 5 * 60 * 1000) {
    localStorage.removeItem('recentRegistration');
    return null;
  }
  
  return registrationData;
};

// Clear registration data
export const clearRegistrationData = () => {
  localStorage.removeItem('recentRegistration');
};