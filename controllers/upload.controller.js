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
  let date = new Date().toLocaleString("en-US", { timeZone: "America/Toronto" });
  date = new Date(date);
  const dateString = `${date.getFullYear()}_${date.getMonth() + 1}_${date.getDate()}_${date.getHours()}_${date.getMinutes()}_${date.getSeconds()}`;

  // Check if user main dir exists, if not create it
  const userDir = req.user.dir;
  if (!fs.existsSync(`./storage/${userDir}`)) {
    fs.mkdirSync(`./storage/${userDir}`, { recursive: true }, err => {
      if (err) {
        console.error(err);
        return next(new ErrorResponse('Error creating user directory.', 500));
      }

      console.log('User directory created successfully!');
    });
  }

  // each upload will be saved in a new directory with the current date inside the user's main dir
  fs.mkdirSync(`./storage/${userDir}/${dateString}`, { recursive: true }, err => {
    if (err) {
      console.error(err);
      return next(new ErrorResponse('Error creating upload directory.', 500));
    }
    console.log('Upload directory created successfully!');
  });

  // each upload will have a description file with with the name description_<current_date>
  const fileContent = `${userName}\n\n${description}\n\nDate: ${new Date(date).toUTCString()}`;

  fs.writeFile(`./storage/${userDir}/${dateString}/description_${dateString}.txt`, fileContent, err => {
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
    file.mv(`./storage/${userDir}/${dateString}/${file.name}`, err => {
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
      file.mv(`./storage/${userDir}/${dateString}/${file.name}`, err => {
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