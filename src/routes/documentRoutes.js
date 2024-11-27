import express from 'express';
import { loggerService } from '../services/loggerService.js';
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
    loggerService.info(`Incoming ${req.method} request to ${req.path}`);
    loggerService.debug(`Request headers: ${JSON.stringify(req.headers)}`);
    loggerService.debug(`Request body: ${JSON.stringify(req.body)}`);

    // Log request start time for performance tracking
    req.requestStartTime = Date.now();

    // Capture original end and json methods to log response details
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
        const responseTime = Date.now() - req.requestStartTime;
        loggerService.info(`Request to ${req.path} completed in ${responseTime}ms`);
        originalEnd.call(this, chunk, encoding);
    };

    next();
});

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
    uploadMiddleware,
    issueDocumentController
);

// Document Verification Route
router.get('/verify/:docId',
    (req, res, next) => {
        loggerService.info(`Verify document route for DocID: ${req.params.docId}`);
        next();
    },
    verifyDocumentController
);

// Document Retrieval Route
router.get('/:docId',
    (req, res, next) => {
        loggerService.info(`Retrieve document route for DocID: ${req.params.docId}`);
        next();
    },
    getDocumentController
);

// Ownership Transfer Route
router.post('/transfer/:docId',
    (req, res, next) => {
        loggerService.info(`Ownership transfer route for DocID: ${req.params.docId}`);
        loggerService.debug(`Transfer request details: ${JSON.stringify({
            currentOwner: req.body.currentOwner,
            newOwner: req.body.newOwner
        })}`);
        next();
    },
    transferOwnershipController
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