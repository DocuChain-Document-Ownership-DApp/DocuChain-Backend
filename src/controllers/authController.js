import { AuthMiddleware } from '../middleware/authMiddleware.js';
import { loggerService } from "../services/loggerService.js";

const authMiddleware = new AuthMiddleware();

export const authController = {
    // Generate nonce for wallet connection
    async generateNonce(req, res) {
        const { walletAddress } = req.body;

        loggerService.info(`Received request to generate nonce for wallet: ${walletAddress}`);
        try {
            const nonce = await authMiddleware.generateNonce(walletAddress);
            loggerService.info(`Nonce generated successfully for wallet: ${walletAddress}`);
            res.json({ nonce });
        } catch (error) {
            loggerService.error(`Error generating nonce for wallet: ${walletAddress}. Error: ${error.message}`);
            res.status(400).json({ error: error.message });
        }
    },

    // Verify signature and authenticate
    async verifySignature(req, res) {
        const { walletAddress, signature, message } = req.body;

        loggerService.info(`Received request to verify signature for wallet: ${walletAddress}`);
        try {
            const tokens = await authMiddleware.verifySignature(walletAddress, signature, message);
            loggerService.info(`Signature verified successfully for wallet: ${walletAddress}`);
            loggerService.debug(`Tokens issued: ${JSON.stringify(tokens)}`);
            res.json(tokens);
        } catch (error) {
            loggerService.warn(`Signature verification failed for wallet: ${walletAddress}. Error: ${error.message}`);
            res.status(401).json({ error: error.message });
        }
    },

    // Refresh access token
    async refreshToken(req, res) {
        const { refreshToken } = req.body;

        loggerService.info(`Received request to refresh access token with refreshToken: ${refreshToken}`);
        try {
            const newAccessToken = await authMiddleware.refreshAccessToken(refreshToken);
            loggerService.info(`Access token refreshed successfully`);
            loggerService.debug(`New access token: ${newAccessToken}`);
            res.json({ accessToken: newAccessToken });
        } catch (error) {
            loggerService.error(`Error refreshing access token. Error: ${error.message}`);
            res.status(401).json({ error: error.message });
        }
    }
};
