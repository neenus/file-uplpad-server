import ErrorResponse from '../utils/errorResponse.js';
import Task from '../models/Task.js';

// @desc    Get all tasks
// @route   GET /api/v1/tasks
// @access  Private
// @query   page: Number, limit: Number, sort: String, sortType: String asc|desc
export const getTasks = async (req, res, next) => {
  if (!req.user)
    return next(new ErrorResponse('Not authorized to access this route', 401));

  const { page, limit, sort, sortType } = req.query;
  const options = {
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 10,
    sort: { [sort]: [sortType === "desc" ? -1 : 1] } || { createdAt: -1 },
  };

  let data;
  try {
    data = await Task
      .find({})
      // replace createdBy with the actual user object
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
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

// @desc    Add a task
// @route   POST /api/v1/tasks
// @access  Private
// @body    name: String, description: String, assignedTo: String, dueDate: Date, frequency: String, notes: String
export const addTask = async (req, res, next) => {
  if (!req.user)
    return next(new ErrorResponse('Not authorized to access this route', 401));

  req.body.createdBy = req.user;
  const task = await Task.create(req.body);

  res.status(201).json({
    success: true,
    data: task
  });
};