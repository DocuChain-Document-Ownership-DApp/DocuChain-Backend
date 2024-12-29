import multer from 'multer';
import { loggerService } from '../services/loggerService.js';

// Detailed Multer configuration
const storage = multer.memoryStorage();

// Common file filter function
const fileFilter = (req, file, cb) => {
    loggerService.info(`File upload filter: ${file.originalname}`);
    loggerService.debug(`File details: ${JSON.stringify({
        originalname: file.originalname,
        mimetype: file.mimetype
    })}`);
    cb(null, true);
};

// Create base multer instance with shared configuration
const createMulterInstance = (options = {}) => {
    return multer({
        storage: storage,
        limits: {
            fileSize: options.maxFileSize || 50 * 1024 * 1024,
            files: options.maxFiles * (Array.isArray(options.field) ? options.field.length : 1) // Adjust for multiple fields
        },
        fileFilter: options.fileFilter || fileFilter
    });
};


// Custom error handler
const handleUploadError = (err, res) => {
    if (err instanceof multer.MulterError) {
        loggerService.error(`Multer upload error: ${err.message}`);
        return res.status(400).json({ error: err.message });
    } else if (err) {
        loggerService.error(`Unknown upload error: ${err.message}`);
        return res.status(500).json({ error: err.message });
    }
};

// Middleware factory for different upload configurations
export const createUploadMiddleware = (config = {}) => {
    const {
        field = 'document',          // Default field name
        maxFiles = 1,               // Default single file
        maxFileSize = 50 * 1024 * 1024, // Default 50MB
        allowedMimeTypes = null,    // Default allow all types
        customFileFilter = null     // Default no custom filter
    } = config;

    // Create custom file filter if mime types are specified
    const mimeTypeFilter = allowedMimeTypes
        ? (req, file, cb) => {
            if (allowedMimeTypes.includes(file.mimetype)) {
                fileFilter(req, file, cb);
            } else {
                cb(new Error(`File type ${file.mimetype} is not allowed`), false);
            }
        }
        : customFileFilter || fileFilter;

    const upload = createMulterInstance({
        maxFileSize,
        maxFiles,
        fileFilter: mimeTypeFilter
    });

    // Return appropriate middleware based on field type
    return (req, res, next) => {
        loggerService.info(`Initiating file upload middleware for ${Array.isArray(field) ? field.join(',') : field}`);

        let uploadHandler;
        if (Array.isArray(field)) {
            // Handle multiple fields with fields()
            const fields = field.map(f => ({ name: f, maxCount: maxFiles }));
            uploadHandler = upload.fields(fields);
        } else {
            // Handle single field with single() or array()
            uploadHandler = maxFiles === 1
                ? upload.single(field)
                : upload.array(field, maxFiles);
        }

        uploadHandler(req, res, (err) => {
            if (err) {
                return handleUploadError(err, res);
            }
            loggerService.info('File upload middleware completed successfully');
            next();
        });
    };
};

// Predefined middleware configurations for common use cases
export const uploadMiddlewares = {
    // Single document upload (original behavior)
    singleDocument: createUploadMiddleware({
        field: 'document',
        maxFiles: 1,
        maxFileSize: 50 * 1024 * 1024
    }),

    // Multiple documents upload
    multipleDocuments: createUploadMiddleware({
        field: 'documents',
        maxFiles: 5,
        maxFileSize: 50 * 1024 * 1024
    }),

    // Image upload with type restriction
    images: createUploadMiddleware({
        field: 'images',
        maxFiles: 10,
        maxFileSize: 5 * 1024 * 1024,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif']
    }),

    // PDF documents only
    pdfDocuments: createUploadMiddleware({
        field: 'pdfs',
        maxFiles: 3,
        maxFileSize: 20 * 1024 * 1024,
        allowedMimeTypes: ['application/pdf']
    }),

    // User registration file upload configuration
    userRegistration: createUploadMiddleware({
        field: ['photo', 'idDocument'], // Multiple fields
        maxFiles: 2,  // 1 file per field
        maxFileSize: 5 * 1024 * 1024, // 5MB limit per file
        allowedMimeTypes: [
            'image/jpg',
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/pdf',
            'image/heic'
        ],
        customFileFilter: (req, file, cb) => {
            loggerService.info(`Processing registration file: ${file.fieldname} - ${file.originalname}`);

            // Specific validation for each field
            if (file.fieldname === 'photo' && !file.mimetype.startsWith('image/')) {
                cb(new Error('Photo must be an image file'), false);
                return;
            }

            if (file.fieldname === 'idDocument' &&
                !['application/pdf', 'image/jpeg', 'image/png'].includes(file.mimetype)) {
                cb(new Error('ID document must be a PDF or image file'), false);
                return;
            }

            cb(null, true);
        }
    })
};