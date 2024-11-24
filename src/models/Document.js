import mongoose from 'mongoose';

const DocumentSchema = new mongoose.Schema({
    docId: {
        type: String,
        required: true,
        unique: true,
    },
    issuer: {
        type: String,
        required: true,
    },
    recipient: {
        type: String,
        required: true,
    },
    ipfsHash: {
        type: String,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.model('Document', DocumentSchema);