import express from 'express';
import { requireAuth, isAdmin } from "../middlewares/auth.middleware.js";

import { getUsers, getUser, updateUser } from '../controllers/users.controller.js';

const router = express.Router();

router.route('/').get(requireAuth, isAdmin, getUsers);
router.route('/:id').get(requireAuth, isAdmin, getUser).put(requireAuth, updateUser);

export default router;