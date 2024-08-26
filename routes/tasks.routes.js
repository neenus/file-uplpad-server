import express from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";

import { getTasks, addTask } from "../controllers/tasks.controller.js";

const router = express.Router();

router.route("/").get(requireAuth, getTasks).post(requireAuth, addTask);

export default router;