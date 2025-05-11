import mongoose from 'mongoose';
import { loggerService } from '../services/loggerService.js'

const DocumentSchema = new mongoose.Schema({
    docId: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: function(v) {
                loggerService.info(`Validating docId: ${v}`);
                return v && v.length > 0;
            },
            message: props => {
                loggerService.warn(`Invalid docId: ${props.value}`);
                return 'DocId must not be empty';
            }
        }
    },
    doc_code: {
        type: String,
        required: true,
        validate: {
            validator: function(v) {
                loggerService.info(`Validating doc_code: ${v}`);
                return v && v.length > 0;
            },
            message: props => {
                loggerService.warn(`Invalid doc_code: ${props.value}`);
                return 'Document code must not be empty';
            }
        }
    },
    issuer: {
        type: String,
        required: true,
        validate: {
            validator: function(v) {
                loggerService.info(`Validating issuer address: ${v}`);
                return /^0x[a-fA-F0-9]{40}$/.test(v);
            },
            message: props => {
                loggerService.warn(`Invalid issuer address: ${props.value}`);
                return 'Invalid Ethereum address';
            }
        }
    },
    recipient: {
        type: String,
        required: true,
        validate: {
            validator: function(v) {
                loggerService.info(`Validating recipient address: ${v}`);
                return /^0x[a-fA-F0-9]{40}$/.test(v);
            },
            message: props => {
                loggerService.warn(`Invalid recipient address: ${props.value}`);
                return 'Invalid Ethereum address';
            }
        }
    },
    ipfsHash: {
        type: String,
        required: true
    },
    fileName: {
        type: String,
        required: true
    },
    fileType: {
        type: String,
        required: true
    },
    fileSize: {
        type: Number,
        required: true,
        validate: {
            validator: function(v) {
                loggerService.info(`Validating file size: ${v} bytes`);
                return v > 0 && v <= 50 * 1024 * 1024; // 50MB limit
            },
            message: props => {
                loggerService.warn(`Invalid file size: ${props.value} bytes`);
                return 'File size must be between 0 and 50MB';
            }
        }
    },
    originalName: {
        type: String,
        required: true
    }
}, {
    timestamps: true,
    // Add mongoose middleware for logging
    hooks: {
        pre: {
            save: function(next) {
                loggerService.info(`Attempting to save document: ${this.docId}`);
                next();
            }
        },
        post: {
            save: function(doc) {
                loggerService.info(`Document saved successfully: ${doc.docId}`);
            }
        }
    }
});

// Add a pre-save hook for additional logging
DocumentSchema.pre('save', function(next) {
    loggerService.info('Pre-save validation started');
    loggerService.debug(`Document details: ${JSON.stringify(this.toObject())}`);
    next();
});

// Add a post-save hook for logging
DocumentSchema.post('save', function(doc) {
    loggerService.info(`Document saved with ID: ${doc.docId}`);
    loggerService.debug(`Saved document details: ${JSON.stringify(doc.toObject())}`);
});

export default mongoose.model('Document', DocumentSchema);