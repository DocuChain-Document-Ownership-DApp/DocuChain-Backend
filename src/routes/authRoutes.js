import express from 'express';
import {authController} from '../controllers/authController.js';
import {loggerService} from '../services/loggerService.js';
import {uploadMiddlewares} from "../middleware/uploadMiddleware.js";

const router = express.Router();

// Logging middleware for auth routes
router.use((req, res, next) => {
    loggerService.info(`Incoming ${req.method} request to ${req.path}`);
    loggerService.debug(`Auth request headers: ${JSON.stringify(req.headers)}`);
    loggerService.debug(`Auth request body: ${JSON.stringify(req.body)}`);

    // Log request start time for performance tracking
    req.requestStartTime = Date.now();

    // Capture original end and json methods to log response details
    const originalEnd = res.end;
    res.end = function (chunk, encoding) {
        const responseTime = Date.now() - req.requestStartTime;
        loggerService.info(`Auth request to ${req.path} completed in ${responseTime}ms`);
        originalEnd.call(this, chunk, encoding);
    };

    next();
});

router.post('/signup',uploadMiddlewares.userRegistration, authController.signup);

// Generate nonce route
router.post('/generate-nonce', authController.generateNonce);

// Verify signature route
router.post('/verify-signature', authController.verifySignature);

// Refresh token route
router.post('/refresh-token', authController.refreshToken);

// Error handling middleware
router.use((err, req, res, next) => {
    loggerService.error(`Unhandled auth error: ${err.message}`);
    loggerService.error(`Error stack: ${err.stack}`);

    res.status(500).json({
        error: 'Authentication Server Error',
        message: err.message,
        timestamp: new Date().toISOString()
    });
});

export default router;