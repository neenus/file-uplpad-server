import ErrorResponse from '../utils/errorResponse.js';

const errorHandler = (err, req, res, next) => {

  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode;

  // Log to console for dev
  console.log(err.stack);

  // Mongoose bad ObjectId error - CastError
  if (err.name === 'CastError') {
    const message = `Resource not found with id of ${err.value}`;
    error = new ErrorResponse(message, 404);
  };

  // Mongoose duplicate key error - MongoError
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = new ErrorResponse(message, 400);
  };

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = new ErrorResponse(message, 400);
  };

  // JSON Web Token error
  if (err.name === 'UnauthorizedError') {
    const message = 'Invalid token';
    error = new ErrorResponse(message, 401);
  };


  // return error response
  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error',
  });
};

export default errorHandler;