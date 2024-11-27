import { create } from 'kubo-rpc-client';
import { logger } from '../logger.js';
import crypto from 'crypto';

const ipfs = create({
    host: process.env.IPFS_HOST,
    port: process.env.IPFS_PORT,
    protocol: process.env.IPFS_PROTOCOL,
});

const addToIPFS = async (file) => {
    try {
        logger.info('Starting IPFS file upload');

        // Validate file
        if (!file) {
            logger.error('No file provided for IPFS upload');
            throw new Error('No file provided');
        }

        // Log file details for debugging
        logger.debug(`File details: ${JSON.stringify({
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size
        })}`);

        // Generate a unique prefix to ensure unique IPFS entries
        const uniquePrefix = crypto.randomBytes(4).toString('hex');
        const enhancedFileName = `${uniquePrefix}_${file.originalname}`;

        logger.info('Preparing file for IPFS upload');
        const uploadResult = await ipfs.add({
            path: enhancedFileName,
            content: file.buffer
        }, {
            // Additional options to preserve file metadata
            wrapWithDirectory: false,
            hashAlg: 'sha2-256'
        });

        // The path might not be the hash, so we use the returned hash
        logger.info(`IPFS upload successful. Hash: ${uploadResult.cid.toString()}`);

        return uploadResult.cid.toString();
    } catch (error) {
        logger.error(`IPFS upload error: ${error.message}`);
        logger.error(`Full error stack: ${error.stack}`);
        throw error;
    }
};

const getFromIPFS = async (hash) => {
    try {
        logger.info(`Starting IPFS file retrieval for hash: ${hash}`);

        if (!hash) {
            logger.error('No hash provided for IPFS retrieval');
            throw new Error('No hash provided');
        }

        logger.info('Initiating IPFS cat stream');
        const stream = ipfs.cat(hash);

        const chunks = [];
        let totalSize = 0;

        logger.info('Accumulating file chunks');
        for await (const chunk of stream) {
            chunks.push(chunk);
            totalSize += chunk.length;
        }

        logger.info(`File retrieval complete. Total chunks: ${chunks.length}, Total size: ${totalSize} bytes`);

        const fileBuffer = Buffer.concat(chunks);

        logger.info(`Returning file buffer. Final buffer size: ${fileBuffer.length} bytes`);
        return fileBuffer;
    } catch (error) {
        logger.error(`IPFS retrieval error for hash ${hash}: ${error.message}`);
        logger.error(`Full error stack: ${error.stack}`);
        throw error;
    }
};

export { addToIPFS, getFromIPFS };