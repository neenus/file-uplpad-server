import ErrorResponse from '../utils/errorResponse.js';
import User from '../models/User.js';

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private/Admin
export const getUsers = async (req, res, next) => {

  const { page, limit } = req.query;
  const options = {
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 10,
    sort: { createdAt: -1 },
  };

  let data;
  if (page && limit) {
    data = {
      page,
      limit,
      users: await User.paginate({}, options),
    }
  }

  res.status(200).json({
    success: true,
    data: data || await User.find(),
  });
};

// @desc    Get single user
// @route   GET /api/v1/users/:id
// @access  Private/Admin
export const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    return next(error)
  }


};

// @desc    Update user
// @route   PUT /api/v1/users/:id
// @access  Private/Admin
export const updateUser = async (req, res, next) => {

  // TODO: to implement user roles so that only admin can update a user
  // check if user is admin or user is updating their own profile
  // if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
  //   return next(new ErrorResponse('Not authorized to access this route', 401));
  // }

  try {
    const user = await User.findById(req.params.id);
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.role = req.body.role || user.role;

    await user.save();

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    return next(error);
  }
};
