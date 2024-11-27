import multer from 'multer';
import path from 'path';
import {logger} from '../logger.js';
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
        logger.info(`File upload filter: ${file.originalname}`);
        logger.debug(`File details: ${JSON.stringify({
            originalname: file.originalname,
            mimetype: file.mimetype
        })}`);
        cb(null, true);
    }
});

export const uploadMiddleware = (req, res, next) => {
    logger.info('Initiating file upload middleware');
    upload.single('document')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            logger.error(`Multer upload error: ${err.message}`);
            return res.status(400).json({error: err.message});
        } else if (err) {
            logger.error(`Unknown upload error: ${err.message}`);
            return res.status(500).json({error: err.message});
        }
        logger.info('File upload middleware completed successfully');
        next();
    });
};

export const issueDocumentController = async (req, res) => {
    const startTime = Date.now();
    logger.info('Starting document issuance process');

    try {
        // Comprehensive request logging
        logger.debug(`Request body: ${JSON.stringify(req.body)}`);
        logger.debug(`Request file: ${JSON.stringify(req.file ? {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        } : 'No file')}`);

        // Validate file upload
        if (!req.file) {
            logger.error('No document uploaded');
            return res.status(400).json({error: 'No document uploaded'});
        }

        // Extract addresses with validation
        const {issuerAddress, recipientAddress} = req.body;
        if (!issuerAddress || !recipientAddress) {
            logger.error('Missing issuer or recipient address');
            return res.status(400).json({error: 'Issuer and recipient addresses are required'});
        }

        logger.info('Preparing to upload file to IPFS');
        const ipfsHash = await addToIPFS(req.file);
        logger.info(`File uploaded to IPFS. Hash: ${ipfsHash}`);

        // Generate a unique and traceable docId
        // const docId = crypto.createHash('sha256')
        //     .update(`${issuerAddress}${recipientAddress}${ipfsHash}${Date.now()}`)
        //     .digest('hex');

        logger.info('Issuing document on blockchain');
        const docId = await issueDocument(
            issuerAddress,
            recipientAddress,
            ipfsHash
        );
        logger.info(`Document issued on blockchain. DocID: ${docId}`);

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

        logger.info('Saving document to database');
        await newDocument.save();
        logger.info('Document saved successfully');

        const processingTime = Date.now() - startTime;
        logger.info(`Document issuance completed in ${processingTime}ms`);

        res.status(201).json({
            docId,
            ipfsHash,
            fileName: req.file.originalname,
            fileType: req.file.mimetype,
            processingTime
        });
    } catch (error) {
        logger.error(`Document issue error: ${error.message}`);
        logger.error(`Full error stack: ${error.stack}`);
        res.status(500).json({
            error: error.message,
            details: error.stack
        });
    }
};

export const getDocumentController = async (req, res) => {
    const startTime = Date.now();
    logger.info(`Retrieving document: ${req.params.docId}`);

    try {
        const {docId} = req.params;

        logger.info('Searching for document in database');
        const document = await Document.findOne({docId});

        if (!document) {
            logger.warn(`Document not found: ${docId}`);
            return res.status(404).json({error: 'Document not found'});
        }

        logger.info('Retrieving file from IPFS');
        const fileBuffer = await getFromIPFS(document.ipfsHash);

        const processingTime = Date.now() - startTime;
        logger.info(`Document retrieval completed in ${processingTime}ms`);

        // Create a response that mirrors the original file upload
        res.set({
            'Content-Type': document.fileType,
            'Content-Disposition': `attachment; filename="${document.originalName}"`,
            'Content-Length': fileBuffer.length
        });

        res.send(fileBuffer);
    } catch (error) {
        logger.error(`Document retrieval error: ${error.message}`);
        logger.error(`Full error stack: ${error.stack}`);
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
        logger.info(`Verify document route for DocID: ${docId}`);

        // Convert hex string to bytes array
        let docIdBytes, prefixedDocId;
        try {
            // Ensure the docId has '0x' prefix for proper conversion
            prefixedDocId = docId.startsWith('0x') ? docId : `0x${docId}`;
            docIdBytes = ethers.getBytes(prefixedDocId);
            logger.info(`Verifying document: ${docId}`);
        } catch (error) {
            logger.error(`Error converting docId to bytes: ${error.message}`);
            throw new Error('Invalid document ID format');
        }
        logger.info(`Verify document route for DocID: ${prefixedDocId}`);
        const isVerified = await verifyDocument(docId);
        logger.info(`Document verification result: ${isVerified}`);
        res.json({isVerified});
    } catch (error) {
        logger.error(`Document verification error: ${error.message}`);
        res.status(500).json({error: error.message});
    }
};

export const transferOwnershipController = async (req, res) => {
    logger.info('Starting ownership transfer process');
    try {
        const {docId} = req.params;
        const {currentOwner, newOwner} = req.body;

        logger.info(`Transfer details - DocID: ${docId}, Current Owner: ${currentOwner}, New Owner: ${newOwner}`);

        await transferOwnership(docId, currentOwner, newOwner);
        logger.info('Blockchain ownership transfer successful');

        const updateResult = await Document.findOneAndUpdate(
            {docId},
            {recipient: newOwner},
            {new: true}
        );

        logger.info(`Database update result: ${JSON.stringify(updateResult)}`);

        res.json({
            message: 'Ownership transferred successfully',
            updatedDocument: updateResult
        });
    } catch (error) {
        logger.error(`Ownership transfer error: ${error.message}`);
        logger.error(`Full error stack: ${error.stack}`);
        res.status(500).json({
            error: error.message,
            details: error.stack
        });
    }
};