/**
 * Timezone utility for frontend (IST - Indian Standard Time)
 * IST = UTC + 5:30
 */

const IST_OFFSET_MINUTES = 330; // 5 hours 30 minutes

/**
 * Get current date in IST (YYYY-MM-DD format)
 * @returns {string} Current date in IST
 */
export function getISTDate() {
  const now = new Date();
  // Add IST offset to get IST time
  const istTime = new Date(now.getTime() + (IST_OFFSET_MINUTES * 60 * 1000));
  
  // Extract date components from IST time
  const year = istTime.getUTCFullYear();
  const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(istTime.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Get current date-time in IST
 * @returns {Date} Current date-time adjusted to IST
 */
export function getISTDateTime() {
  const now = new Date();
  return new Date(now.getTime() + (IST_OFFSET_MINUTES * 60 * 1000));
}

/**
 * Get current time in IST (HH:MM format)
 * @returns {string} Current time in IST
 */
export function getISTTime() {
  const istDateTime = getISTDateTime();
  const hours = String(istDateTime.getUTCHours()).padStart(2, '0');
  const minutes = String(istDateTime.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}


