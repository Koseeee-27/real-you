import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import registerRouter from './routes/register';
import gamesRouter from './routes/games';
import resultsRouter from './routes/results';
import voiceRouter from './routes/voice';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/register', registerRouter);
app.use('/api/games', gamesRouter);
app.use('/api/results', resultsRouter);
app.use('/api/voice', voiceRouter);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
