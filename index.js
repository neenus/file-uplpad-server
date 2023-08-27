import express from 'express';
import fileUpload from 'express-fileupload';
import morgan from 'morgan';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';

dotenv.config({ path: './config/.env' });

const app = express();

const PORT = process.env.PORT || 7000;

// Middlewares
// CORS Config
const corsOptions = {
  origin: process.env.DEV_CLIENT_URL,
  credentials: true,
};
app.use(cors(corsOptions));

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Morgan logger
app.use(morgan('dev'));

app.post('/upload', fileUpload({ useTempFiles: true }), (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send({ success: false, message: 'No files were uploaded.' });
  }

  // save files in the storage folder  
  Object.keys(req.files).forEach((key) => {
    const file = req.files[key];
    file.description = key;

    const fileName = file.name.split('.');
    const fileExt = fileName[fileName.length - 1];
    fileName.pop();
    fileName.push(key);
    file.name = fileName.join("_") + "." + fileExt;

    file.mv(`./storage/${file.name}`, (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send
          (err);
      }
    });
  });

  res.status(200).send({ success: true, message: 'File uploaded successfully!' });
});

app.listen(PORT, async () => {
  // connect to the database
  await connectDB();

  console.log(`Server is running on ${process.env.DEV_SERVER_URL}:${process.env.PORT}`)
});