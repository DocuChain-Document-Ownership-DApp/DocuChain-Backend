import multer from 'multer';
import {loggerService} from '../services/loggerService.js';
import Document from '../models/Document.js';
import {addToIPFS, getFromIPFS} from '../services/ipfsService.js';
import {
    issueDocument,
    verifyDocument,
    transferOwnership
} from '../services/blockchainService.js';
import {ethers} from 'ethers';
import {DocumentClass} from '../models/documentClassModel.js';
import {DocumentClassIndex} from "../models/DocumentClassesIndexModel.js";
import mongoose from 'mongoose';


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
        const issuerAddress = req.user.walletAddress;
        const {recipientAddress, doc_code} = req.body;

        if (!issuerAddress || !recipientAddress) {
            loggerService.error('Missing issuer or recipient address');
            return res.status(400).json({error: 'Issuer and recipient addresses are required'});
        }

        if (!doc_code) {
            loggerService.error('Missing document code');
            return res.status(400).json({error: 'Document code is required'});
        }

        loggerService.info('Preparing to upload file to IPFS');
        const ipfsHash = await addToIPFS(req.file);
        loggerService.info(`File uploaded to IPFS. Hash: ${ipfsHash}`);

        loggerService.info(`Issuing document on blockchain with code: ${doc_code}`);
        const docId = await issueDocument(
            issuerAddress,
            recipientAddress,
            ipfsHash,
            doc_code
        );
        loggerService.info(`Document issued on blockchain. DocID: ${docId}`);

        // Create document record
        const newDocument = new Document({
            docId,
            doc_code, // Add document code to the model
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
            doc_code, // Include document code in response
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
        const {docId} = req.body;

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

export const verifyDocumentController = async (req, res) => {
    try {
        const {docId} = req.body;
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
        const currentOwner = req.user.walletAddress;
        const {docId, newOwner} = req.body;

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
            message: 'Ownership transferred successfully'
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

export const searchIssuedDocumentsController = async (req, res) => {
    const startTime = Date.now();
    loggerService.info('Starting document retrieval process');

    try {
        const userWalletAddress = req.user.walletAddress;
        const {recipientAddress} = req.body;

        if (!/^0x[a-fA-F0-9]{40}$/.test(userWalletAddress)) {
            loggerService.error(`Invalid authenticated user wallet address: ${userWalletAddress}`);
            return res.status(400).json({error: 'Invalid user wallet address format'});
        }

        const query = {};

        if (recipientAddress) {
            if (!/^0x[a-fA-F0-9]{40}$/.test(recipientAddress)) {
                loggerService.error(`Invalid recipient address format: ${recipientAddress}`);
                return res.status(400).json({error: 'Invalid recipient address format'});
            }
            query.recipient = recipientAddress;
        }

        // If both issuer and recipient were not specified in the request, search for any documents where the user is either
        if (!recipientAddress) {
            query.$or = [
                {issuer: userWalletAddress},
                {recipient: userWalletAddress}
            ];
        } else {
            query.issuer = userWalletAddress;
        }

        loggerService.info('Searching for documents with query', query);

        const documents = await Document.find(query, {
            docId: 1,
            issuer: 1,
            recipient: 1,
            createdAt: 1,
            updatedAt: 1,
            doc_code: 1,
            _id: 0
        });

        const processingTime = Date.now() - startTime;

        loggerService.info(`Found ${documents.length} documents matching the criteria`);

        res.json({
            documents,
            totalCount: documents.length,
            processingTime,
            searchCriteria: {
                issuerAddress: query.issuer || 'Any (user-related)',
                recipientAddress: query.recipient || 'Any (user-related)'
            }
        });
    } catch (error) {
        loggerService.error(`Document retrieval error: ${error.message}`);
        loggerService.error(`Full error stack: ${error.stack}`);
        res.status(500).json({
            error: error.message,
            details: error.stack
        });
    }
};


export const getDocumentClassesIndexController = async (req, res) => {
    const startTime = Date.now();
    loggerService.info('Starting document classes index retrieval process');

    try {
        // First get the index to determine available sectors
        const index = await DocumentClassIndex.findOne().lean();

        if (!index) {
            loggerService.warn('Document classes index not found');
            return res.status(404).json({
                success: false,
                error: 'Document classes index not found'
            });
        }

        // Remove mongoose metadata fields
        const {_id, __v, createdAt, updatedAt, ...sectors} = index;
        const sectorNames = Object.keys(sectors);

        // Build the aggregation pipeline dynamically based on available sectors
        const pipeline = [
            {$match: {_id: index._id}},
            {
                $project: {
                    _id: 0,
                    __v: 0,
                    createdAt: 0,
                    updatedAt: 0
                }
            }
        ];

        // Add $lookup stages for each sector
        sectorNames.forEach(sectorName => {
            pipeline.push({
                $lookup: {
                    from: 'document_classes',
                    localField: sectorName,
                    foreignField: '_id',
                    as: sectorName
                }
            });
        });

        // Add $addFields to extract the first element from each lookup array
        pipeline.push({
            $addFields: Object.fromEntries(
                sectorNames.map(sectorName => [
                    sectorName,
                    {$arrayElemAt: [`$${sectorName}`, 0]}
                ])
            )
        });

        // Execute the aggregation
        const [result] = await DocumentClassIndex.aggregate(pipeline);

        if (!result) {
            throw new Error('Failed to aggregate document classes index');
        }

        // Prepare the response data
        const sectorsWithData = {};
        sectorNames.forEach(sectorName => {
            if (!result[sectorName]) {
                loggerService.warn(`Referenced document class not found for sector: ${sectorName}`);
                sectorsWithData[sectorName] = {
                    error: 'Referenced document class not found',
                    documentClassId: sectors[sectorName]
                };
            } else {
                sectorsWithData[sectorName] = result[sectorName];
            }
        });

        const processingTime = Date.now() - startTime;

        res.json({
            success: true,
            sectors: sectorsWithData,
            totalSectors: sectorNames.length,
            processingTime: `${processingTime}ms`
        });

    } catch (error) {
        loggerService.error(`Document classes index retrieval error: ${error.message}`);
        loggerService.error(`Full error stack: ${error.stack}`);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve document classes index',
            details: error.message
        });
    }
};