import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import {ethers} from 'ethers';
import {NonceService} from '../services/nonceService.js';
import {loggerService} from '../services/loggerService.js';
import {userModel} from '../models/userModel.js';
import {isAddress, verifyMessage} from 'ethers';
import {canAccessDocument} from "../services/blockchainService.js";


export class AuthMiddleware {
    constructor() {
        this.nonceService = new NonceService();
    }

    // Generate a nonce for a wallet address
    async generateNonce(walletAddress) {
        // Validate wallet address format
        if (!isAddress(walletAddress)) {
            throw new Error('Invalid Ethereum address');
        }

        // Check if user exists
        const existingUser = await userModel.findOne({ walletAddress });
        if (!existingUser) {
            throw new Error('Please create an account first');
        }

        // Generate nonce only if user exists
        const nonce = this.nonceService.generateNonce(walletAddress);

        // Update nonce for existing user
        await userModel.findOneAndUpdate(
            { walletAddress },
            {
                $set: {
                    "authentication.currentNonce": nonce,
                    "authentication.lastNonceGeneratedAt": new Date()
                }
            },
            { new: true }
        );

        return nonce;
    }

    // Verify Metamask signature
    async verifySignature(walletAddress, signature, message, ipAddress) {
        try {
            // Retrieve stored nonce for this wallet
            const user = await userModel.findOne({walletAddress});
            if (!user || !user.authentication.currentNonce) {
                throw new Error('No valid nonce found');
            }

            // Verify nonce is still valid
            if (!this.nonceService.validateNonce(user.authentication.currentNonce)) {
                throw new Error('Nonce has expired');
            }
            loggerService.info('walletAddres',walletAddress);
            loggerService.info('ipadd', ipAddress);
            loggerService.info('message',message);
            loggerService.info('signature',signature);

            // Recover signer address
            const signerAddress = verifyMessage(message, signature);
            loggerService.info(`walletID: ${walletAddress}, signerID: ${signerAddress}`);

            loggerService.info(signerAddress.toLowerCase(),walletAddress.toLowerCase())

            // Ensure signed message is from the claimed wallet
            if (signerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
                await this.incrementAuthAttempts(walletAddress);
                throw new Error('Signature verification failed');
            }


            //Invalidate used nonce
            await userModel.updateOne(
                { walletAddress: walletAddress }, // Query to find the document
                {
                    $set: {
                        'authentication.currentNonce': null, // Reset nonce
                        'authentication.authAttempts': 0, // Reset authentication attempts
                        'security.lastLogin': new Date(), // Register current datetime in lastLogin
                    },
                    $push: {
                        'security.loginHistory': {
                            $each: [{ timestamp: new Date(), ipAddress: ipAddress }], // Add new login record
                            $slice: -15, // Retain only the last 15 entries
                        },
                    },
                }
            );

            // Generate JWT tokens
            return this.generateTokens(walletAddress);
        } catch (error) {
            loggerService.error(`Signature verification error: ${error.message}`);
            throw error;
        }
    }

    async incrementAuthAttempts(walletAddress) {
        try {
            // Define the maximum allowed attempts and lockout duration
            const MAX_ATTEMPTS = 5;
            const LOCK_DURATION_MINUTES = 15;

            // Fetch the user document
            const user = await userModel.findOne({ walletAddress });

            if (!user) {
                throw new Error('User not found');
            }

            // Increment authAttempts
            const updatedAttempts = user.authentication.authAttempts + 1;

            // Check if lockout is needed
            const updates = {
                'authentication.authAttempts': updatedAttempts,
            };

            if (updatedAttempts >= MAX_ATTEMPTS) {
                updates['authentication.lockedUntil'] = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000); // Lock for 15 minutes
            }

            // Update the user document
            await userModel.updateOne(
                { walletAddress },
                { $set: updates }
            );

            return {
                success: true,
                message: updatedAttempts >= MAX_ATTEMPTS
                    ? 'Account locked due to too many authentication attempts'
                    : 'Authentication attempts incremented',
            };
        } catch (error) {
            console.error('Error incrementing auth attempts:', error.message);
            return { success: false, message: error.message };
        }
    }

    // Generate JWT tokens
    generateTokens(walletAddress) {
        const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
        const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;

        // Access token (1 hour)
        const accessToken = jwt.sign({walletAddress, type: 'access'}, accessTokenSecret, {expiresIn: '1h'});
        loggerService.info(`accessToken: ${accessToken}`);
        // Refresh token (30 days)
        const refreshToken = jwt.sign({walletAddress, type: 'refresh'}, refreshTokenSecret, {expiresIn: '30d'});

        return {accessToken, refreshToken};
    }

    // Authentication middleware for routes
    async authenticateRequest(req, res, next) {
        try {
            const authHeader = req.headers.authorization;

            if (!authHeader) {
                return res.status(401).json({error: 'No token provided'});
            }

            const token = authHeader.split(' ')[1];
            const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;

            // Verify token
            const decoded = jwt.verify(token, accessTokenSecret);

            loggerService.info(`accessToken: ${decoded}`);

            // Validate token type
            if (decoded.type !== 'access') {
                return res.status(401).json({error: 'Invalid token type'});
            }

            // Optional: Additional checks (e.g., user exists, not blacklisted)
            const user = await userModel.findOne({
                walletAddress: decoded.walletAddress
            });

            if (!user) {
                return res.status(401).json({error: 'User not found'});
            }

            // Attach user to request
            req.user = {
                walletAddress: decoded.walletAddress
            };

            next();
        } catch (error) {
            loggerService.error(`Authentication error: ${error.message}`);

            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({error: 'Token expired'});
            }

            return res.status(401).json({error: 'Authentication failed'});
        }
    }

    verifyDocumentAccess(req, res, next) {
        return async (req, res, next) => {
            try {
                const docId = req.body.docId;
                const userAddress = req.user.walletAddress;

                if (!docId) {
                    return res.status(400).json({error: 'Document ID is required'});
                }

                const hasAccess = await canAccessDocument(docId, userAddress);

                if (!hasAccess) {
                    return res.status(403).json({
                        error: 'Access denied', message: 'You do not have permission to access this document'
                    });
                }

                next();
            } catch (error) {
                loggerService.error(`Document access verification failed: ${error.message}`);
                return res.status(500).json({
                    error: 'Access verification failed', message: 'Unable to verify document access'
                });
            }
        };
    }

    // Refresh token mechanism
    async refreshAccessToken(refreshToken) {
        try {
            const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;

            // Verify refresh token
            const decoded = jwt.verify(refreshToken, refreshTokenSecret);

            // Validate token type
            if (decoded.type !== 'refresh') {
                throw new Error('Invalid refresh token');
            }

            // Generate new access token
            return this.generateTokens(decoded.walletAddress).accessToken;
        } catch (error) {
            loggerService.error(`Token refresh error: ${error.message}`);
            throw error;
        }
    }
}