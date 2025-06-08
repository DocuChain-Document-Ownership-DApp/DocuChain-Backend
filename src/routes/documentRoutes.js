import express from 'express';
import {loggerService} from '../services/loggerService.js';
import {AuthMiddleware} from '../middleware/authMiddleware.js';
import {uploadMiddlewares} from "../middleware/uploadMiddleware.js";
import {
    issueDocumentController,
    verifyDocumentController,
    getDocumentController,
    transferOwnershipController,
    searchIssuedDocumentsController,
    getDocumentClassesIndexController,
    generateVerificationOTPController,
    verifyDocumentWithOTPController
} from '../controllers/documentController.js';
import Document from '../models/Document.js';
import {userModel} from '../models/userModel.js';
import {emailService} from '../services/emailService.js';
import {generateOTPForUser, verifyOTP} from '../services/otpService.js';
import {verifyDocument} from '../services/blockchainService.js';
import {ethers} from 'ethers';

const router = express.Router();
const authMiddleware = new AuthMiddleware();

// Global request logging middleware
router.use((req, res, next) => {
    loggerService.info(`Incoming ${req.method} request to ${req.path}`);
    loggerService.debug(`Request headers: ${JSON.stringify(req.headers)}`);
    loggerService.debug(`Request body: ${JSON.stringify(req.body)}`);

    // Log request start time for performance tracking
    req.requestStartTime = Date.now();

    // Capture original end and json methods to log response details
    const originalEnd = res.end;
    res.end = function (chunk, encoding) {
        const responseTime = Date.now() - req.requestStartTime;
        loggerService.info(`Request to ${req.path} completed in ${responseTime}ms`);
        originalEnd.call(this, chunk, encoding);
    };

    next();
});

// Authentication middleware for all routes
router.use(authMiddleware.authenticateRequest.bind(authMiddleware));

// Document Issue Route with Comprehensive Logging
router.post('/issue',
    (req, res, next) => {
        loggerService.info('Executing document issue route');
        loggerService.debug(`Issue request details: ${JSON.stringify({
            issuerAddress: req.body.issuerAddress,
            recipientAddress: req.body.recipientAddress,
            fileDetails: req.file ? {
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size
            } : 'No file'
        })}`);
        next();
    },
    uploadMiddlewares.singleDocument,
    issueDocumentController
);

// Document Verification Routes
router.get('/verify',
    (req, res, next) => {
        loggerService.info(`Generate OTP for document verification - DocID: ${req.query.docId}`);
        next();
    },
    generateVerificationOTPController
);

router.post('/verify',
    (req, res, next) => {
        loggerService.info(`Verify document route for DocID: ${req.body.docId}`);
        next();
    },
    verifyDocumentWithOTPController
);

router.post(
    '/get',
    authMiddleware.verifyDocumentAccess().bind(authMiddleware), // Authorization middleware
    (req, res, next) => {
        loggerService.info(`Retrieve document route for DocID: ${req.body.docId}`);
        next();
    },
    getDocumentController // Document retrieval controller
);

// Ownership Transfer Route
router.post('/transfer',
    (req, res, next) => {
        loggerService.info(`Ownership transfer route for DocID: ${req.body.docId}`);
        loggerService.debug(`Transfer request details: ${JSON.stringify({
            currentOwner: req.body.currentOwner,
            newOwner: req.body.newOwner
        })}`);
        next();
    },
    transferOwnershipController
);

// Document Search Route
router.post('/search',
    (req, res, next) => {
        loggerService.info('Executing document search route');
        loggerService.debug(`Search request body: ${JSON.stringify({
            issuerAddress: req.body.issuerAddress,
            recipientAddress: req.body.recipientAddress
        })}`);
        next();
    },
    searchIssuedDocumentsController
);

router.get('/document-classes',
    (req, res, next) => {
        loggerService.info('Executing document classes index route');
        loggerService.debug(`Request query parameters: ${JSON.stringify({
            sectors: req.query.sectors
        })}`);
        next();
    },
    getDocumentClassesIndexController
);

// Error handling middleware
router.use((err, req, res, next) => {
    loggerService.error(`Unhandled error: ${err.message}`);
    loggerService.error(`Error stack: ${err.stack}`);

    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message,
        timestamp: new Date().toISOString()
    });
});


export default router;