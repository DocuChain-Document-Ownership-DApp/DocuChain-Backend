import { loggerService } from './loggerService.js';
import Document from '../models/Document.js';
import { userModel } from '../models/userModel.js';
import { emailService } from './emailService.js';
import { generateOTPForUser, verifyOTP } from './otpService.js';
import { verifyDocument } from './blockchainService.js';
import { ethers } from 'ethers';
import { getFromIPFS } from './ipfsService.js';
import { getEmailTemplate } from '../utils/emailTemplate.js';

class DocumentVerificationService {
    async generateVerificationOTP(docId) {
        // Get document from database to find owner's email
        const document = await Document.findOne({ docId });
        if (!document) {
            throw new Error('Document not found');
        }

        // Get owner's email from user model
        const owner = await userModel.findOne({ walletAddress: document.recipient });
        if (!owner || !owner.profile.email) {
            throw new Error('Document owner email not found');
        }

        // Generate OTP
        const otp = generateOTPForUser(docId);

        // Get email template
        const emailTemplate = getEmailTemplate();

        // Send OTP via email
        await emailService.sendEmail({
            to: owner.profile.email,
            subject: 'Document Verification OTP',
            text: `Your OTP for document verification is: ${otp}. This OTP is valid for 5 minutes.`,
            html: emailTemplate
                .replace('Headline', 'Document Verification OTP')
                .replace('Subject', 'Your Document Verification Code')
                .replace('Message-Body', `Your OTP for document verification is: <strong>${otp}</strong>. This OTP is valid for 5 minutes. If you didn't request this OTP, please ignore this email.`)
        });

        return { message: 'OTP sent successfully' };
    }

    async verifyDocumentWithOTP(docId, otp) {
        // Verify OTP first
        const isOTPValid = verifyOTP(docId, otp);
        if (!isOTPValid) {
            throw new Error('Invalid or expired OTP');
        }

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

        const isVerified = await verifyDocument(docId);
        loggerService.info(`Document verification result: ${isVerified}`);

        if (!isVerified) {
            return { isVerified };
        }

        // Get document details
        const document = await Document.findOne({ docId });
        if (!document) {
            throw new Error('Document not found');
        }

        // Get owner details
        const owner = await userModel.findOne({ walletAddress: document.recipient });
        if (!owner) {
            throw new Error('Document owner not found');
        }

        // Get owner's photo from IPFS
        let photoBuffer = null;
        try {
            if (owner.profile.photo && owner.profile.photo.ipfsHash) {
                photoBuffer = await getFromIPFS(owner.profile.photo.ipfsHash);
                // Ensure we have a proper buffer
                if (photoBuffer && !Buffer.isBuffer(photoBuffer)) {
                    photoBuffer = Buffer.from(photoBuffer);
                }
            }
        } catch (error) {
            loggerService.error(`Error retrieving owner's photo: ${error.message}`);
            // Continue without photo if there's an error
        }

        return {
            isVerified,
            document: {
                docId: document.docId,
                doc_code: document.doc_code,
                issuer: document.issuer,
                recipient: document.recipient,
                fileName: document.fileName,
                fileType: document.fileType,
                fileSize: document.fileSize
            },
            owner: {
                walletAddress: owner.walletAddress,
                name: owner.profile.name,
                uid: owner.profile.uid.uid,
                dob: owner.profile.dob,
                photo: photoBuffer ? {
                    buffer: photoBuffer,
                    type: 'image/jpeg' // Assuming JPEG, adjust if needed
                } : null
            }
        };
    }
}

export const documentVerificationService = new DocumentVerificationService(); 