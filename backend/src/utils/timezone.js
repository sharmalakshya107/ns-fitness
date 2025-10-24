/**
 * Timezone utility for Indian Standard Time (IST)
 * IST = UTC + 5:30
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds

/**
 * Get current date-time in IST
 * @returns {Date} Current date-time adjusted to IST
 */
function getISTDateTime() {
  const now = new Date();
  return new Date(now.getTime() + IST_OFFSET_MS);
}

/**
 * Get current date in IST (YYYY-MM-DD format)
 * @returns {string} Current date in IST
 */
function getISTDate() {
  const istDateTime = getISTDateTime();
  return istDateTime.toISOString().split('T')[0];
}

/**
 * Get current time in IST (HH:MM format)
 * @returns {string} Current time in IST (24-hour format)
 */
function getISTTime() {
  const istDateTime = getISTDateTime();
  return istDateTime.toISOString().split('T')[1].substring(0, 5);
}

/**
 * Convert any date to IST
 * @param {Date|string} date - Date to convert
 * @returns {Date} Date adjusted to IST
 */
function toIST(date) {
  const dateObj = date instanceof Date ? date : new Date(date);
  return new Date(dateObj.getTime() + IST_OFFSET_MS);
}

module.exports = {
  getISTDateTime,
  getISTDate,
  getISTTime,
  toIST,
  IST_OFFSET_MS
};

