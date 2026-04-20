import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import registerRouter from './routes/register';
import gamesRouter from './routes/games';
import resultsRouter from './routes/results';
import voiceRouter from './routes/voice';
import healthRouter from './routes/health';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3001;
const allowedOrigins = process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(',') 
    : ['http://localhost:3000'];

// Middleware
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
}));
app.use(express.json());

// Routes
app.use('/api/register', registerRouter);
app.use('/api/games', gamesRouter);
app.use('/api/results', resultsRouter);
app.use('/api/voice', voiceRouter);
app.use('/health', healthRouter);

app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});