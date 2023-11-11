import express from 'express';
import fileUpload from "express-fileupload";
import { requireAuth } from "../middlewares/auth.middleware.js";

// import upload controller
import { upload } from '../controllers/upload.controller.js';

const router = express.Router();

router.route('/').post(requireAuth, fileUpload({ useTempFiles: true }), upload);

export default router;
