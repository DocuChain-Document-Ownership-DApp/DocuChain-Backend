import crypto from 'crypto';

export class NonceService {
    // Generate cryptographically secure nonce
    generateNonce(walletAddress) {
        const timestamp = Date.now();
        const randomBytes = crypto.randomBytes(16).toString('hex');
        return `${walletAddress}:${timestamp}:${randomBytes}`;
    }

    // Validate nonce age
    validateNonce(nonce, maxAgeMinutes = 1500) {
        const parts = nonce.split(':');
        if (parts.length !== 3) return false;

        const timestamp = parseInt(parts[1]);
        const nonceAge = Date.now() - timestamp;
        return nonceAge <= (maxAgeMinutes * 60 * 1000);
    }
}