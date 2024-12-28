import { AuthMiddleware } from '../middleware/authMiddleware.js';
import { loggerService } from "../services/loggerService.js";
import { ethers } from 'ethers';
import { userModel } from '../models/userModel.js';
import { addToIPFS } from '../services/ipfsService.js';

const authMiddleware = new AuthMiddleware();

export const authController = {

    async signup(req, res) {
        const startTime = Date.now();
        loggerService.info('Starting user registration process');

        try {
            // Validate required files first
            if (!req.files || !req.files.photo || !req.files.idDocument) {
                loggerService.error('Missing required files');
                return res.status(400).json({ error: 'Both photo and ID document are required' });
            }

            // Extract user data from request body
            const { walletAddress, name, email, phone, uid, dob } = req.body;

            // Validate wallet address
            if (!ethers.isAddress(walletAddress)) {
                loggerService.error('Invalid wallet address provided');
                return res.status(400).json({ error: 'Invalid wallet address' });
            }

            // Validate other required fields
            if (!name || !email || !phone || !uid || !dob) {
                loggerService.error('Missing required user information');
                return res.status(400).json({ error: 'All user information fields are required' });
            }



            // Upload files to IPFS
            loggerService.info('Uploading files to IPFS');
            const [photoHash, idHash] = await Promise.all([
                addToIPFS(req.files.photo[0]),
                addToIPFS(req.files.idDocument[0]),
            ]);

            // Create new user document
            const newUser = new userModel({
                walletAddress,
                profile: {
                    name,
                    email,
                    phone,
                    uid: {
                        uid,
                        ipfsHash: idHash
                    },
                    dob: new Date(dob),
                    photo: {
                        ipfsHash: photoHash,
                        uploadedAt: new Date()
                    }
                }
            });

            // Save user to database
            await newUser.save();

            const processingTime = Date.now() - startTime;
            loggerService.info(`User registered successfully: ${walletAddress} in ${processingTime}ms`);

            // Return success response
            res.status(201).json({
                success: true,
                walletAddress,
                processingTime
            });

        } catch (error) {
            const processingTime = Date.now() - startTime;
            loggerService.error(`Registration error: ${error.message}`);
            loggerService.error(`Stack: ${error.stack}`);

            // Handle duplicate key error
            if (error.code === 11000) {
                return res.status(409).json({
                    error: 'User already exists with this wallet address or email',
                    processingTime
                });
            }

            // Handle other errors
            res.status(500).json({
                error: error.message,
                processingTime
            });
        }
    },

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
        const ipAddress=req.headers['x-forwarded-for'] || req.socket.remoteAddress || null

        loggerService.info(`Received request to verify signature for wallet: ${walletAddress}`);
        try {
            const tokens = await authMiddleware.verifySignature(walletAddress, signature, message, ipAddress);
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
