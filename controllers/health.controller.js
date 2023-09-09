// @desc    Get Server Health
// @route   GET /api/v1/health
// @access  Public
export const getHealth = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, data: "OK" });
  } catch (error) {
    return next(error);
  }
}

