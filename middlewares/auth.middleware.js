import jwt from 'jsonwebtoken';
import ErrorResponse from "../utils/errorResponse.js";
import User from '../models/User.js';

const requireAuth = async (req, res, next) => {

  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    // Set token from cookie
    token = req.cookies.token;
  }

  // Check if token exists
  if (!token) {
    next(new ErrorResponse('Not authorized to access this route', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await User.findById(decoded.id);
    if (!user) return next(new ErrorResponse('Invalid credentials', 401));

    // Set user on req object
    req.user = user;

    next();
  } catch (err) {
    next(new ErrorResponse('Not authorized to access this route', 401));
  }
};

export default requireAuth;