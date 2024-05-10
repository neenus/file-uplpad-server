import ErrorResponse from '../utils/errorResponse.js';
import User from '../models/User.js';
import fs from 'fs';
import path from 'path';

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private/Admin
// @query   page: Number, limit: Number, sort: String, sortType: String asc|desc
export const getUsers = async (req, res, next) => {

  if (req.user && req.user.role !== 'admin')
    return next(new ErrorResponse('Not authorized to access this route', 401));

  const { page, limit, sort, sortType } = req.query;


  const options = {
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 10,
    sort: { [sort]: [sortType === "desc" ? -1 : 1] } || { createdAt: -1 },
  };

  let data;
  try {
    data = await User
      .find({})
      .select('-password')
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .sort(options.sort)
      .exec();
  } catch (error) {
    return next(error)
  }

  res.status(200).json({
    success: true,
    data: data
  });
};

// @desc    Get single user
// @route   GET /api/v1/users/:id
// @access  Private/Admin
export const getUser = async (req, res, next) => {
  if (req.user && req.user.role !== 'admin')
    return next(new ErrorResponse('Not authorized to access this route', 401));

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
  const isAdmin = req.user?.role === 'admin';
  const isOwnProfile = req.user?.id === req.params.id;

  // if req.body is empty, return error
  if (Object.keys(req.body).length === 0)
    return next(new ErrorResponse('Please provide data to update', 400));

  // check if user is admin or user is updating their own profile
  // non-admin users can only update their own profile except for the role
  if (!isAdmin && !isOwnProfile) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }

  if (req.body.role && !isAdmin) {
    return next(new ErrorResponse('Not authorized to update role', 401));
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) return next(new ErrorResponse('User not found', 404));

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

export const deleteUser = async (req, res, next) => {

  const userId = req.params.id;

  try {
    const user = await User.findById(userId);
    if (!user) return next(new ErrorResponse('User not found', 404));

    // Remove user directory and all files.
    await removeUserDir(user.dir);
    await user.deleteOne();

    res.status(200).json({
      success: true,
      data: user,
    });

  } catch (error) {
    return next(error);
  }

}

// Helper function to remove user directory and all files.
const removeUserDir = async dir => {
  const userDir = path.join(process.env.FILE_STORAGE_PATH, dir);
  try {
    await fs.rmSync(userDir, { recursive: true });
  } catch (error) {
    return new ErrorResponse('Error deleting user directory', 500);
  }
}