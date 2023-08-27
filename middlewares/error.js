import ErrorResponse from '../utils/errorResponse.js';

const errorHandler = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.message || 'Server Error';

  // Log to console for dev
  console.log(err.stack.red);

  if (err.name === "ValidationError") {
    const message = Object.values(err.errors).map((val) => val.message);
    status = 400;
  }

  if (err.name === "UnauthorizedError") {
    status = 401;
    message = "Invalid token";
  }

  res.status(status).json({
    success: false,
    message,
  });
};

export default errorHandler;