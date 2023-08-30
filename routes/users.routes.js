import express from 'express';
import requireAuth from "../middlewares/auth.middleware.js";

import { getUsers, getUser, updateUser } from '../controllers/users.controller.js';

const router = express.Router();

router.route('/').get(requireAuth, getUsers);
router.route('/:id').get(requireAuth, getUser).put(requireAuth, updateUser);

export default router;