import ErrorResponse from '../utils/errorResponse.js';
import User from '../models/User.js';


// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
export const register = async (req, res, next) => {
  const { name, email, password } = req.body;

  // if (!name || !email || !password) {
  //   return next(new ErrorResponse('Please provide all required fields', 400));
  // }

  try {
    // Create user
    const user = await User.create({
      name,
      email,
      password,
    });

    if (user) {
      res.status(201).json({
        success: true,
        data: user,
      });
    }
  } catch (error) {
    return next(error);
  };
};


// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
export const login = async (req, res, next) => {
  const { email, password } = req.body;

  // Validate email and password
  if (!email || !password) {
    return next(new ErrorResponse('Please provide email and password', 400));
  };

  // Check if user email exists in database
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return next(new ErrorResponse('Invalid credentials', 401));
  };

  // Check if password matches
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return next(new ErrorResponse('Invalid credentials', 401));
  };

  // return user without password
  res.status(200).json({
    success: true,
    data: user,
  });
};
