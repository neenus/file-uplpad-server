import express from 'express';
import { requireAuth, isAdmin } from "../middlewares/auth.middleware.js";

import { getUsers, getUser, updateUser, deleteUser } from '../controllers/users.controller.js';

const router = express.Router();

router.route('/').get(requireAuth, isAdmin, getUsers);
router.route('/:id')
  .get(requireAuth, isAdmin, getUser)
  .put(requireAuth, updateUser)
  .delete(requireAuth, isAdmin, deleteUser)

export default router;