import multer from 'multer';
import path from 'path';
import {loggerService} from '../services/loggerService.js';
import Document from '../models/Document.js';
import {addToIPFS, getFromIPFS} from '../services/ipfsService.js';
import {
    issueDocument,
    verifyDocument,
    transferOwnership
} from '../services/blockchainService.js';
import crypto from 'crypto';
import {ethers} from 'ethers';

// Detailed Multer configuration
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB file size limit
    },
    fileFilter: (req, file, cb) => {
        loggerService.info(`File upload filter: ${file.originalname}`);
        loggerService.debug(`File details: ${JSON.stringify({
            originalname: file.originalname,
            mimetype: file.mimetype
        })}`);
        cb(null, true);
    }
});

export const uploadMiddleware = (req, res, next) => {
    loggerService.info('Initiating file upload middleware');
    upload.single('document')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            loggerService.error(`Multer upload error: ${err.message}`);
            return res.status(400).json({error: err.message});
        } else if (err) {
            loggerService.error(`Unknown upload error: ${err.message}`);
            return res.status(500).json({error: err.message});
        }
        loggerService.info('File upload middleware completed successfully');
        next();
    });
};

export const issueDocumentController = async (req, res) => {
    const startTime = Date.now();
    loggerService.info('Starting document issuance process');

    try {
        // Comprehensive request logging
        loggerService.debug(`Request body: ${JSON.stringify(req.body)}`);
        loggerService.debug(`Request file: ${JSON.stringify(req.file ? {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        } : 'No file')}`);

        // Validate file upload
        if (!req.file) {
            loggerService.error('No document uploaded');
            return res.status(400).json({error: 'No document uploaded'});
        }

        // Extract addresses with validation
        const {issuerAddress, recipientAddress} = req.body;
        if (!issuerAddress || !recipientAddress) {
            loggerService.error('Missing issuer or recipient address');
            return res.status(400).json({error: 'Issuer and recipient addresses are required'});
        }

        loggerService.info('Preparing to upload file to IPFS');
        const ipfsHash = await addToIPFS(req.file);
        loggerService.info(`File uploaded to IPFS. Hash: ${ipfsHash}`);

        // Generate a unique and traceable docId
        // const docId = crypto.createHash('sha256')
        //     .update(`${issuerAddress}${recipientAddress}${ipfsHash}${Date.now()}`)
        //     .digest('hex');

        loggerService.info('Issuing document on blockchain');
        const docId = await issueDocument(
            issuerAddress,
            recipientAddress,
            ipfsHash
        );
        loggerService.info(`Document issued on blockchain. DocID: ${docId}`);

        // Create document record
        const newDocument = new Document({
            docId,
            issuer: issuerAddress,
            recipient: recipientAddress,
            ipfsHash,
            fileName: req.file.originalname,
            fileType: req.file.mimetype,
            fileSize: req.file.size,
            originalName: req.file.originalname
        });

        loggerService.info('Saving document to database');
        await newDocument.save();
        loggerService.info('Document saved successfully');

        const processingTime = Date.now() - startTime;
        loggerService.info(`Document issuance completed in ${processingTime}ms`);

        res.status(201).json({
            docId,
            ipfsHash,
            fileName: req.file.originalname,
            fileType: req.file.mimetype,
            processingTime
        });
    } catch (error) {
        loggerService.error(`Document issue error: ${error.message}`);
        loggerService.error(`Full error stack: ${error.stack}`);
        res.status(500).json({
            error: error.message,
            details: error.stack
        });
    }
};

export const getDocumentController = async (req, res) => {
    const startTime = Date.now();
    loggerService.info(`Retrieving document: ${req.params.docId}`);

    try {
        const {docId} = req.params;

        loggerService.info('Searching for document in database');
        const document = await Document.findOne({docId});

        if (!document) {
            loggerService.warn(`Document not found: ${docId}`);
            return res.status(404).json({error: 'Document not found'});
        }

        loggerService.info('Retrieving file from IPFS');
        const fileBuffer = await getFromIPFS(document.ipfsHash);

        const processingTime = Date.now() - startTime;
        loggerService.info(`Document retrieval completed in ${processingTime}ms`);

        // Create a response that mirrors the original file upload
        res.set({
            'Content-Type': document.fileType,
            'Content-Disposition': `attachment; filename="${document.originalName}"`,
            'Content-Length': fileBuffer.length
        });

        res.send(fileBuffer);
    } catch (error) {
        loggerService.error(`Document retrieval error: ${error.message}`);
        loggerService.error(`Full error stack: ${error.stack}`);
        res.status(500).json({
            error: error.message,
            details: error.stack
        });
    }
};

// Similar logging pattern for other controllers...
export const verifyDocumentController = async (req, res) => {
    try {
        const {docId} = req.params;
        loggerService.info(`Verify document route for DocID: ${docId}`);

        // Convert hex string to bytes array
        let docIdBytes, prefixedDocId;
        try {
            // Ensure the docId has '0x' prefix for proper conversion
            prefixedDocId = docId.startsWith('0x') ? docId : `0x${docId}`;
            docIdBytes = ethers.getBytes(prefixedDocId);
            loggerService.info(`Verifying document: ${docId}`);
        } catch (error) {
            loggerService.error(`Error converting docId to bytes: ${error.message}`);
            throw new Error('Invalid document ID format');
        }
        loggerService.info(`Verify document route for DocID: ${prefixedDocId}`);
        const isVerified = await verifyDocument(docId);
        loggerService.info(`Document verification result: ${isVerified}`);
        res.json({isVerified});
    } catch (error) {
        loggerService.error(`Document verification error: ${error.message}`);
        res.status(500).json({error: error.message});
    }
};

export const transferOwnershipController = async (req, res) => {
    loggerService.info('Starting ownership transfer process');
    try {
        const {docId} = req.params;
        const {currentOwner, newOwner} = req.body;

        loggerService.info(`Transfer details - DocID: ${docId}, Current Owner: ${currentOwner}, New Owner: ${newOwner}`);

        await transferOwnership(docId, currentOwner, newOwner);
        loggerService.info('Blockchain ownership transfer successful');

        const updateResult = await Document.findOneAndUpdate(
            {docId},
            {recipient: newOwner},
            {new: true}
        );

        loggerService.info(`Database update result: ${JSON.stringify(updateResult)}`);

        res.json({
            message: 'Ownership transferred successfully',
            updatedDocument: updateResult
        });
    } catch (error) {
        loggerService.error(`Ownership transfer error: ${error.message}`);
        loggerService.error(`Full error stack: ${error.stack}`);
        res.status(500).json({
            error: error.message,
            details: error.stack
        });
    }
};