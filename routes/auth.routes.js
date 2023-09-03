import express from 'express';
import requireAuth from "../middlewares/auth.middleware.js";

// import register and login from auth controller
import { register, login, logout, getMe } from '../controllers/auth.controller.js';

const router = express.Router();

router.route('/register').post(register);
router.route('/login').post(login);
router.route('/logout').get(logout);
router.route('/me').get(requireAuth, getMe);

export default router;
