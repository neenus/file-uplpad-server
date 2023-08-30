import express from 'express';
import fileUpload from 'express-fileupload';
import morgan from 'morgan';
import cors from 'cors';
import dotenv from 'dotenv';
import ErrorResponse from './utils/errorResponse.js';
import errorHandler from './middlewares/error.js';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import connectDB from './config/db.js';

// Load routes
import auth from './routes/auth.routes.js';
import users from './routes/users.routes.js';

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

// Cookie Parser
app.use(cookieParser());

// Morgan logger
app.use(morgan('dev'));

app.post('/api/v1/upload', fileUpload({ useTempFiles: true }), (req, res, next) => {

  if (!req.files || Object.keys(req.files).length === 0)
    return next(new ErrorResponse('No files were uploaded.', 400));

  if (!req.body.description)
    return next(new ErrorResponse('No description provided.', 400));

  if (!req.body.userName)
    return next(new ErrorResponse('No user name provided.', 400));

  const { files } = req.files;
  const { description, userName } = req.body;

  // Create a folder for the user if it doesn't exist
  const directoryName = userName.split(' ').join('_');
  if (!fs.existsSync(`./storage/${directoryName}`)) {
    fs.mkdirSync(`./storage/${directoryName}`, { recursive: true }, err => {
      if (err) {
        console.error(err);
        return next(new ErrorResponse('Error creating user directory.', 500));
      }

      console.log('User directory created successfully!');
    });
  }

  // save the description in a file and append date to the file name to avoid overwriting
  const date = new Date();

  const dateString = `${date.getFullYear()}_${date.getMonth() + 1}_${date.getDate()}_${date.getHours()}_${date.getMinutes()}_${date.getSeconds()}`;
  const fileName = `description_${dateString}.txt`;

  fs.writeFile(`./storage/${directoryName}/${fileName}.txt`, description, err => {
    if (err) {
      console.error(err);
      return next(new ErrorResponse('Error saving description.', 500));
    }

    console.log('Description saved successfully!');
  });


  // check if files is an array for multiple files, otherwise save the single file
  if (!Array.isArray(files)) {
    // Single file upload
    const file = files;
    file.mv(`./storage/${directoryName}/${file.name}`, err => {
      if (err) {
        console.error(err);
        return next(new ErrorResponse('Error saving file.', 500));
      }

      console.log('File saved successfully!');
    });
  } else {
    // Multiple files upload
    // loop through all the files and save them in the storage folder
    files.forEach(file => {
      file.mv(`./storage/${directoryName}/${file.name}`, err => {
        if (err) {
          console.error(err);
          return next(new ErrorResponse('Error saving file.', 500));
        }

        console.log('File saved successfully!');
      });
    });
  }

  res.status(200).send({ success: true, message: 'File uploaded successfully!' });
});

// Mount routes
app.use('/api/v1/auth', auth);
app.use('/api/v1/users', users);

// Error Handler Middleware
app.use(errorHandler);

app.listen(PORT, async () => {
  // connect to the database
  await connectDB();

  console.log(`Server is running on ${process.env.DEV_SERVER_URL}:${process.env.PORT}`)
});