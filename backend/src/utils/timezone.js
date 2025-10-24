/**
 * Timezone utility for Indian Standard Time (IST)
 * Render servers run on UTC, so we need to convert to IST (UTC+5:30)
 */

const IST_OFFSET_MINUTES = 330; // IST is UTC + 5 hours 30 minutes = 330 minutes

/**
 * Get current date-time in IST
 * @returns {Date} Current date-time in IST
 */
function getISTDateTime() {
  const now = new Date();
  // Get UTC time and add IST offset
  const istTime = new Date(now.getTime() + (IST_OFFSET_MINUTES * 60 * 1000));
  return istTime;
}

/**
 * Get current date in IST (YYYY-MM-DD format)
 * Uses local date components after IST conversion
 */
function getISTDate() {
  const istDateTime = getISTDateTime();
  // Extract date components from the IST-adjusted time
  const year = istDateTime.getUTCFullYear();
  const month = String(istDateTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(istDateTime.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get current time in IST (HH:MM format - 24 hour)
 */
function getISTTime() {
  const istDateTime = getISTDateTime();
  const hours = String(istDateTime.getUTCHours()).padStart(2, '0');
  const minutes = String(istDateTime.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Convert any date to IST
 * @param {Date|string} date - Date to convert
 * @returns {Date} Date adjusted to IST
 */
function toIST(date) {
  const dateObj = date instanceof Date ? date : new Date(date);
  return new Date(dateObj.getTime() + (IST_OFFSET_MINUTES * 60 * 1000));
}

module.exports = {
  getISTDateTime,
  getISTDate,
  getISTTime,
  toIST,
  IST_OFFSET_MINUTES
};
