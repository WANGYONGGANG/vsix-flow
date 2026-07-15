import express from 'express';
import cors from 'cors';
import { EastMoneyProvider } from './providers/eastmoneyProvider.js';
import sectorsRouter from './routes/sectors.js';
import intradayRouter from './routes/intraday.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Only EastMoney provider
const provider = new EastMoneyProvider();
app.locals.getProvider = () => provider;

app.use('/api/sectors', sectorsRouter);
app.use('/api/intraday', intradayRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), source: provider.name });
});

app.listen(PORT, () => {
  console.log(`FundFlow backend listening on http://localhost:${PORT}`);
  console.log(`Data source: ${provider.name}`);
});
