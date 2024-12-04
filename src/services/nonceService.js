import crypto from 'crypto';
import loggerService from './loggerService.js';

export class NonceService {
    // Generate cryptographically secure nonce
    generateNonce(walletAddress) {
        const timestamp = Date.now();
        const randomBytes = crypto.randomBytes(16).toString('hex');
        const nonce = `${walletAddress}:${timestamp}:${randomBytes}`;
        loggerService.debug(`Nonce generated for wallet: ${walletAddress}`);
        return nonce;
    }

    // Validate nonce age
    validateNonce(nonce, maxAgeMinutes = 1500) {
        try {
            const parts = nonce.split(':');
            if (parts.length !== 3) {
                loggerService.warn(`Invalid nonce format: ${nonce}`);
                return false;
            }

            const timestamp = parseInt(parts[1]);
            const nonceAge = Date.now() - timestamp;
            const isValid = nonceAge <= (maxAgeMinutes * 60 * 1000);

            loggerService.debug(`Nonce validation result: ${isValid}`);
            return isValid;
        } catch (error) {
            loggerService.error('Error validating nonce:', error);
            return false;
        }
    }
}