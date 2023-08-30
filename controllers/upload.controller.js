import ErrorResponse from "../utils/errorResponse.js";
import fs from 'fs';

// @desc    Upload file
// @route   POST /api/v1/upload
// @access  Private

export const upload = async (req, res, next) => {

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
};