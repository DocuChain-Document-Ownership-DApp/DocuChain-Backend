import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import documentRoutes from './routes/documentRoutes.js';
import authRoutes from './routes/authRoutes.js';
import loggerService from "./services/loggerService.js";
import cors from 'cors';

loggerService.info('Starting application...');

dotenv.config();
loggerService.info('Environment variables loaded');

const app = express();

// CORS configuration (optional but recommended)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    next();
});

const corsOptions = {
    origin: ['http://localhost:5173'], // Add your frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
    credentials: true // Enable if you're using cookies/sessions
};
app.use(cors(corsOptions));

app.use(express.json());
loggerService.info('JSON middleware configured');

// Mount routes
app.use('/api/documents', documentRoutes);
app.use('/auth', authRoutes);
loggerService.info('Document and Auth routes configured');

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