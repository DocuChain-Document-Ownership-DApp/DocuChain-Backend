import mongoose from 'mongoose';
import { loggerService } from '../services/loggerService.js';

const DocumentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    code: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        unique: true
    }
}, { _id: false });

const DepartmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    documents: [DocumentSchema]
}, { _id: false });

const StateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    departments: [DepartmentSchema]
}, { _id: false });

const AuthoritySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    departments: {
        type: [DepartmentSchema],
        required: function() {
            return !this.states;
        }
    },
    states: {
        type: [StateSchema],
        required: function() {
            return !this.departments;
        }
    }
}, { _id: false });

const DocumentClassSchema = new mongoose.Schema({
    class: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    authorities: [AuthoritySchema]
}, {
    timestamps: true
});

// Index for faster querying by document codes
DocumentClassSchema.index({ 'authorities.departments.documents.code': 1 });
DocumentClassSchema.index({ 'authorities.states.departments.documents.code': 1 });

// Helper methods
DocumentClassSchema.methods = {
    // Find a document by its code
    findDocumentByCode: function(code) {
        for (const authority of this.authorities) {
            if (authority.departments) {
                for (const department of authority.departments) {
                    const doc = department.documents.find(d => d.code === code);
                    if (doc) return doc;
                }
            }

            if (authority.states) {
                for (const state of authority.states) {
                    for (const department of state.departments) {
                        const doc = department.documents.find(d => d.code === code);
                        if (doc) return doc;
                    }
                }
            }
        }
        return null;
    },

    // Get all document codes in this class
    getAllDocumentCodes: function() {
        const codes = [];

        for (const authority of this.authorities) {
            if (authority.departments) {
                for (const department of authority.departments) {
                    codes.push(...department.documents.map(d => d.code));
                }
            }

            if (authority.states) {
                for (const state of authority.states) {
                    for (const department of state.departments) {
                        codes.push(...department.documents.map(d => d.code));
                    }
                }
            }
        }

        return codes;
    }
};

// Logging hooks
DocumentClassSchema.post('save', function (doc) {
    loggerService.info(`DocumentClass saved: ${doc.class}`);
});

DocumentClassSchema.post('findOneAndUpdate', function (doc) {
    loggerService.info(`DocumentClass updated: ${doc.class}`);
});

// Export the Model
const DocumentClass = mongoose.model('DocumentClass', DocumentClassSchema);
export { DocumentClass };