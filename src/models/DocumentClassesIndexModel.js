import mongoose from 'mongoose';
import {loggerService} from '../services/loggerService.js';

const DocumentClassIndexSchema = new mongoose.Schema(
    {
        Government: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'DocumentClass',
            required: true
        }
    },
    {
        timestamps: true,
        strict: false // Allows dynamic fields for different sectors
    }
);

DocumentClassIndexSchema.pre('save', async function(next) {
    try {
        for (const [sector, id] of Object.entries(this.toObject())) {
            if (sector === '_id' || sector === '__v' || sector === 'createdAt' || sector === 'updatedAt') continue;

            if (!await DocumentClass.exists({ _id: id })) {
                throw new Error(`Referenced DocumentClass not found for ${sector}`);
            }
        }
        next();
    } catch (error) {
        next(error);
    }
});

DocumentClassIndexSchema.index({ Government: 1 });

// Pre-save hook to validate referenced document classes
DocumentClassIndexSchema.pre('save', async function (next) {
    try {
        const DocumentClass = mongoose.model('DocumentClass');

        // Check all referenced document classes exist
        for (const [sector, classId] of Object.entries(this.toObject())) {
            if (sector === '_id' || sector === '__v' || sector === 'createdAt' || sector === 'updatedAt') continue;

            if (!mongoose.Types.ObjectId.isValid(classId)) {
                throw new Error(`Invalid ObjectId for ${sector}`);
            }

            const exists = await DocumentClass.exists({_id: classId});
            if (!exists) {
                throw new Error(`Referenced DocumentClass not found for ${sector}`);
            }
        }

        next();
    } catch (error) {
        loggerService.error(`DocumentClassIndex validation error: ${error.message}`);
        next(error);
    }
});

// Static methods
DocumentClassIndexSchema.statics = {
    // Add a new sector to the index
    async addSector(sectorName, documentClassId) {
        if (!sectorName || !documentClassId) {
            throw new Error('Both sectorName and documentClassId are required');
        }

        // Validate the document class exists
        const DocumentClass = mongoose.model('DocumentClass');
        const exists = await DocumentClass.exists({_id: documentClassId});
        if (!exists) {
            throw new Error('Referenced DocumentClass not found');
        }

        // Update or create the index with the new sector
        let index = await this.findOne();
        if (!index) {
            index = new this();
        }

        index.set(sectorName, documentClassId);
        return index.save();
    },

    // Get all indexed sectors with their document classes
    async getAllSectors() {
        const index = await this.findOne().lean();
        if (!index) return {};

        // Remove mongoose metadata fields
        const {_id, __v, createdAt, updatedAt, ...sectors} = index;
        return sectors;
    },

    // Get a specific sector's document class
    async getSector(sectorName) {
        const index = await this.findOne().lean();
        if (!index || !index[sectorName]) {
            return null;
        }

        return {
            sector: sectorName,
            documentClassId: index[sectorName]
        };
    },

    // Remove a sector from the index
    async removeSector(sectorName) {
        const index = await this.findOne();
        if (!index || !index.get(sectorName)) {
            return false;
        }

        index.set(sectorName, undefined, {strict: false});
        await index.save();
        return true;
    }
};

// Logging hooks
DocumentClassIndexSchema.post('save', function (doc) {
    loggerService.info(`DocumentClassIndex updated`);
});

DocumentClassIndexSchema.post('findOneAndUpdate', function (doc) {
    loggerService.info(`DocumentClassIndex updated`);
});

// Export the Model
const DocumentClassIndex = mongoose.model('DocumentClassIndex', DocumentClassIndexSchema, 'document_classes_index');
export {DocumentClassIndex};