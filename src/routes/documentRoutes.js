import express from 'express';
import { logger } from '../logger.js';
import {
    issueDocumentController,
    verifyDocumentController,
    getDocumentController,
    transferOwnershipController,
    uploadMiddleware
} from '../controllers/documentController.js';

const router = express.Router();

// Global request logging middleware
router.use((req, res, next) => {
    logger.info(`Incoming ${req.method} request to ${req.path}`);
    logger.debug(`Request headers: ${JSON.stringify(req.headers)}`);
    logger.debug(`Request body: ${JSON.stringify(req.body)}`);

    // Log request start time for performance tracking
    req.requestStartTime = Date.now();

    // Capture original end and json methods to log response details
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
        const responseTime = Date.now() - req.requestStartTime;
        logger.info(`Request to ${req.path} completed in ${responseTime}ms`);
        originalEnd.call(this, chunk, encoding);
    };

    next();
});

// Document Issue Route with Comprehensive Logging
router.post('/issue',
    (req, res, next) => {
        logger.info('Executing document issue route');
        logger.debug(`Issue request details: ${JSON.stringify({
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
    uploadMiddleware,
    issueDocumentController
);

// Document Verification Route
router.get('/verify/:docId',
    (req, res, next) => {
        logger.info(`Verify document route for DocID: ${req.params.docId}`);
        next();
    },
    verifyDocumentController
);

// Document Retrieval Route
router.get('/:docId',
    (req, res, next) => {
        logger.info(`Retrieve document route for DocID: ${req.params.docId}`);
        next();
    },
    getDocumentController
);

// Ownership Transfer Route
router.post('/transfer/:docId',
    (req, res, next) => {
        logger.info(`Ownership transfer route for DocID: ${req.params.docId}`);
        logger.debug(`Transfer request details: ${JSON.stringify({
            currentOwner: req.body.currentOwner,
            newOwner: req.body.newOwner
        })}`);
        next();
    },
    transferOwnershipController
);

// Error handling middleware
router.use((err, req, res, next) => {
    logger.error(`Unhandled error: ${err.message}`);
    logger.error(`Error stack: ${err.stack}`);

    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message,
        timestamp: new Date().toISOString()
    });
});

export default router;