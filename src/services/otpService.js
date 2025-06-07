import crypto from 'crypto';

// In-memory storage for OTPs (in production, use a database)
const otpStore = new Map();

/**
 * Generate a 6-digit OTP
 * @returns {string} 6-digit OTP
 */
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Generate OTP for a given user ID
 * @param {string} userId - User ID or any unique identifier
 * @returns {string} Generated OTP
 */
const generateOTPForUser = (userId) => {
    const otp = generateOTP();
    const timestamp = Date.now();
    
    // Store OTP with timestamp
    otpStore.set(userId, {
        otp,
        timestamp,
        attempts: 0
    });

    return otp;
};

/**
 * Verify OTP for a given user ID
 * @param {string} userId - User ID or any unique identifier
 * @param {string} otp - OTP to verify
 * @returns {boolean} Whether OTP is valid
 */
const verifyOTP = (userId, otp) => {
    const storedData = otpStore.get(userId);
    
    if (!storedData) {
        return false;
    }

    const { otp: storedOTP, timestamp, attempts } = storedData;
    const currentTime = Date.now();
    const validityPeriod = 5 * 60 * 1000; // 5 minutes in milliseconds

    // Check if OTP is expired
    if (currentTime - timestamp > validityPeriod) {
        otpStore.delete(userId);
        return false;
    }

    // Check if maximum attempts reached (3 attempts)
    if (attempts >= 3) {
        otpStore.delete(userId);
        return false;
    }

    // Increment attempts
    storedData.attempts += 1;
    otpStore.set(userId, storedData);

    // Verify OTP
    if (storedOTP === otp) {
        otpStore.delete(userId); // Clear OTP after successful verification
        return true;
    }

    return false;
};

/**
 * Clean up expired OTPs
 */
const cleanupExpiredOTPs = () => {
    const currentTime = Date.now();
    const validityPeriod = 5 * 60 * 1000; // 5 minutes in milliseconds

    for (const [userId, data] of otpStore.entries()) {
        if (currentTime - data.timestamp > validityPeriod) {
            otpStore.delete(userId);
        }
    }
};

// Run cleanup every minute
setInterval(cleanupExpiredOTPs, 60 * 1000);

export {
    generateOTPForUser,
    verifyOTP
};
