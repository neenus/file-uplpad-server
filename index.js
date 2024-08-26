import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import dotenv from 'dotenv';
import errorHandler from './middlewares/error.js';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';

// Load routes
import auth from './routes/auth.routes.js';
import users from './routes/users.routes.js';
import upload from './routes/upload.routes.js';
import health from './routes/health.routes.js';
import fileManager from './routes/fileManager.routes.js';
import tasks from './routes/tasks.routes.js';

dotenv.config({ path: './config/.env' });

const app = express();

const PORT = process.env.PORT || 7000;

// Middlewares
// CORS Config
const corsOptions = {
  origin: process.env.NODE_ENV === 'development' ?
    [process.env.DEV_CLIENT_URL, process.env.DEV_XLSX2CSV_URL] : [process.env.PROD_CLIENT_URL, process.env.PROD_XLSX2CSV_URL],
  credentials: true,
};
app.use(cors(corsOptions));

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie Parser
app.use(cookieParser());

// Morgan logger
app.enable('trust proxy');
process.env.NODE_ENV === 'development' ?
  app.use(morgan('dev')) :
  app.use(morgan(':remote-addr - [:date[iso]] ":method :url HTTP/:http-version" :status :res[content-length]'));

// Mount routes
app.use('/api/v1/auth', auth);
app.use('/api/v1/users', users);
app.use('/api/v1/upload', upload);
app.use('/api/v1/health', health);
app.use('/api/v1/filemanager', fileManager);
app.use('/api/v1/tasks', tasks);

// Error Handler Middleware
app.use(errorHandler);

app.listen(PORT, async () => {
  // connect to the database
  await connectDB();

  console.log(`Server is running on ${process.env.DEV_SERVER_URL}:${process.env.PORT}`)
});