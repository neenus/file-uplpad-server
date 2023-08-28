import express from 'express';

import { getUsers, getUser, updateUser } from '../controllers/users.controller.js';

const router = express.Router();

router.route('/').get(getUsers);
router.route('/:id').get(getUser).put(updateUser);

export default router;