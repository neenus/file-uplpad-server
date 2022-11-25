import express from 'express';
import fileUpload from 'express-fileupload';
import morgan from 'morgan';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

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
    return res.status(400).send('No files were uploaded.');
  }

  // save files in the storage folder  
  Object.keys(req.files).forEach((key) => {
    const file = req.files[key];
    file.description = key;
    file.mv(`./storage/${file.name}`, (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send
          (err);
      }
    });
  });

  res.send('File uploaded!');
});

app.listen(PORT, () => console.log(`Server is running on ${process.env.DEV_SERVER_URL}:${process.env.PORT}`));