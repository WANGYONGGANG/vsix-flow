import express from 'express';
import cors from 'cors';
import sectorsRouter from './routes/sectors.js';
import intradayRouter from './routes/intraday.js';
import historicalRouter from './routes/historical.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/sectors', sectorsRouter);
app.use('/api/intraday', intradayRouter);
app.use('/api/historical', historicalRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`FundFlow backend listening on http://localhost:${PORT}`);
});