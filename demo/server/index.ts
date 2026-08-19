import express from 'express';
import cors from 'cors';
import { processRoute } from './routes/process';
import { validateRoute } from './routes/validate';

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.post('/process', processRoute);
app.post('/validate', validateRoute);

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Demo server running at http://localhost:${PORT}`);
});
