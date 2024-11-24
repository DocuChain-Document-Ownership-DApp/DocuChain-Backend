import Document from '../models/Document.js';
import { addToIPFS, getFromIPFS } from '../services/ipfsService.js';
import { issueDocument, verifyDocument, transferOwnership } from '../services/blockchainService.js';

export const issueDocumentController = async (req, res) => {
    console.log('Entering issueDocumentController');
    console.log('Request body:', req.body);
    try {
        const { issuerAddress, recipientAddress, content } = req.body;
        console.log('Extracted data:', { issuerAddress, recipientAddress, content: content.substring(0, 50) + '...' });

        console.log('Calling addToIPFS');
        const ipfsHash = await addToIPFS(content);
        console.log('IPFS Hash:', ipfsHash);

        console.log('Calling issueDocument');
        const docId = await issueDocument(issuerAddress, recipientAddress, ipfsHash);
        console.log('Document ID:', docId);

        console.log('Creating new Document model');
        const newDocument = new Document({
            docId,
            issuer: issuerAddress,
            recipient: recipientAddress,
            ipfsHash,
        });
        console.log('New Document:', newDocument);

        console.log('Saving document to database');
        await newDocument.save();
        console.log('Document saved successfully');

        console.log('Sending response');
        res.status(201).json({ docId, ipfsHash });
    } catch (error) {
        console.error('Error in issueDocumentController:', error);
        res.status(500).json({ error: error.message });
    }
};

export const verifyDocumentController = async (req, res) => {
    console.log('Entering verifyDocumentController');
    console.log('Request params:', req.params);
    try {
        const { docId } = req.params;
        console.log('Document ID to verify:', docId);

        console.log('Calling verifyDocument');
        const isVerified = await verifyDocument(docId);
        console.log('Verification result:', isVerified);

        console.log('Sending response');
        res.json({ isVerified });
    } catch (error) {
        console.error('Error in verifyDocumentController:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getDocumentController = async (req, res) => {
    console.log('Entering getDocumentController');
    console.log('Request params:', req.params);
    try {
        const { docId } = req.params;
        console.log('Document ID to retrieve:', docId);

        console.log('Querying database for document');
        const document = await Document.findOne({ docId });
        console.log('Document found:', document);

        if (!document) {
            console.log('Document not found');
            return res.status(404).json({ error: 'Document not found' });
        }

        console.log('Calling getFromIPFS');
        const content = await getFromIPFS(document.ipfsHash);
        console.log('IPFS content retrieved, length:', content.length);

        console.log('Sending response');
        res.json({ document, content });
    } catch (error) {
        console.error('Error in getDocumentController:', error);
        res.status(500).json({ error: error.message });
    }
};

export const transferOwnershipController = async (req, res) => {
    console.log('Entering transferOwnershipController');
    console.log('Request params:', req.params);
    console.log('Request body:', req.body);
    try {
        const { docId } = req.params;
        const { currentOwner, newOwner } = req.body;
        console.log('Transfer details:', { docId, currentOwner, newOwner });

        console.log('Calling transferOwnership');
        await transferOwnership(docId, currentOwner, newOwner);
        console.log('Ownership transferred on blockchain');

        console.log('Updating document in database');
        const updateResult = await Document.findOneAndUpdate({ docId }, { recipient: newOwner });
        console.log('Update result:', updateResult);

        console.log('Sending response');
        res.json({ message: 'Ownership transferred successfully' });
    } catch (error) {
        console.error('Error in transferOwnershipController:', error);
        res.status(500).json({ error: error.message });
    }
};