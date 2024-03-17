import express from "express";
import multer from "multer";
import { requireAuth } from "../middlewares/auth.middleware.js";

import { GetImage, Upload, Download, Read } from "../controllers/fileManager.controller.js";

const router = express.Router();

//Multer to upload the files to the server
var fileName = [];
//MULTER CONFIG: to get file photos to temp server storage
const multerConfig = {
  //specify diskStorage (another option is memory)
  storage: multer.diskStorage({
    //specify destination
    destination: function (req, file, next) {
      next(null, './');
    },

    //specify the filename to be unique
    filename: function (req, file, next) {
      fileName.push(file.originalname);
      next(null, file.originalname);

    }
  }),

  // filter out and prevent non-image files.
  fileFilter: function (req, file, next) {
    next(null, true);
  }
};

router.route("/:dir/GetImage").get(requireAuth, GetImage);
router.route("/:dir/Upload").post(requireAuth, multer(multerConfig).any('uploadFiles'), Upload);
router.route("/:dir/Download").post(requireAuth, Download);
router.route("/:dir").post(requireAuth, Read);


export default router;