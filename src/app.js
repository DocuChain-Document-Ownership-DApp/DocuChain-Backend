import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import documentRoutes from './routes/documentRoutes.js';

console.log('Starting application...');

dotenv.config();
console.log('Environment variables loaded');

const app = express();

app.use(express.json());
console.log('JSON middleware configured');

app.use('/api/documents', documentRoutes);
console.log('Document routes configured');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        console.log('Attempting to connect to database...');
        await connectDB();
        console.log('Database connected successfully');

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log('Server startup complete');
        });
    } catch (error) {
        console.error('Failed to start the server:', error);
        process.exit(1);
    }
};

startServer();

export default app;