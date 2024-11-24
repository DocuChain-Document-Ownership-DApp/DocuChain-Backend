import express from 'express';
import {
    issueDocumentController,
    verifyDocumentController,
    getDocumentController,
    transferOwnershipController
} from '../controllers/documentController.js';

const router = express.Router();

router.post('/issue', issueDocumentController);
router.get('/verify/:docId', verifyDocumentController);
router.get('/:docId', getDocumentController);
router.post('/transfer/:docId', transferOwnershipController);

export default router;