import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import {ethers} from 'ethers';
import {NonceService} from '../services/nonceService.js';
import {loggerService} from '../services/loggerService.js';
import {userModel} from '../models/userModel.js';
import { isAddress, verifyMessage } from 'ethers';



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

        // Generate and store nonce
        const nonce = this.nonceService.generateNonce(walletAddress);



        // // Optional: Store nonce in database for verification
        await userModel.findOneAndUpdate(
            { walletAddress: walletAddress },
            {
                $set: {
                    walletAddress, // Ensure wallet address is correctly set
                    "authentication.currentNonce": nonce,
                    "authentication.lastNonceGeneratedAt": new Date(),
                    "authentication.authAttempts": 0, // Reset auth attempts if needed
                    "authentication.lockedUntil": null, // Reset lock status

                    "compliance.kycVerified": false, // Maintain KYC status
                    "compliance.roles": ["user"], // Default role

                    "security.lastLogin": null, // Optional if not updated
                    "security.loginHistory": [], // Optional if not updated

                    status: "active", // Maintain status
                    updatedAt: new Date() // Ensure the updated time is refreshed
                }
            },
            { upsert: true, new: true } // Create if not exists, and return updated document
        );


        return nonce;
    }

    // Verify Metamask signature
    async verifySignature(walletAddress, signature, message) {
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

            // Recover signer address
            const signerAddress = verifyMessage(message, signature);
            loggerService.info(`walletID: ${walletAddress}, signerID: ${signerAddress}`);

            // Ensure signed message is from the claimed wallet
            if (signerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
                throw new Error('Signature verification failed');
            }

            //Invalidate used nonce
            //userModel.authentication.currentNonce = null;
            await userModel.updateOne(
                { walletAddress: walletAddress }, // Query to find the document
                { $set: { 'authentication.currentNonce': null } } // Update operation
              );
            

            // Generate JWT tokens
            return this.generateTokens(walletAddress);
        } catch (error) {
            loggerService.error(`Signature verification error: ${error.message}`);
            throw error;
        }
    }

    // Generate JWT tokens
    generateTokens(walletAddress) {
        const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
        const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;

        // Access token (1 hour)
        const accessToken = jwt.sign(
            {walletAddress, type: 'access'},
            accessTokenSecret,
            {expiresIn: '1h'}
        );
        loggerService.info(`accessToken: ${accessToken}`);
        // Refresh token (30 days)
        const refreshToken = jwt.sign(
            {walletAddress, type: 'refresh'},
            refreshTokenSecret,
            {expiresIn: '30d'}
        );

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