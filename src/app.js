import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import documentRoutes from './routes/documentRoutes.js';
import loggerService from "./services/loggerService.js";

loggerService.info('Starting application...');

dotenv.config();
loggerService.info('Environment variables loaded');

const app = express();

app.use(express.json());
loggerService.info('JSON middleware configured');

app.use('/api/documents', documentRoutes);
loggerService.info('Document routes configured');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        loggerService.info('Attempting to connect to database...');
        await connectDB();
        loggerService.info('Database connected successfully');

        app.listen(PORT, () => {
            loggerService.info(`Server running on port ${PORT}`);
            loggerService.info('Server startup complete');
        });
    } catch (error) {
        loggerService.error('Failed to start the server:', error);
        process.exit(1);
    }
};

startServer();

export default app;