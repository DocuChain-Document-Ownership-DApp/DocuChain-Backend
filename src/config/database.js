import mongoose from 'mongoose';
import loggerService from "../services/loggerService.js";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        loggerService.info('MongoDB connected successfully');
    } catch (error) {
        loggerService.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

export default connectDB;