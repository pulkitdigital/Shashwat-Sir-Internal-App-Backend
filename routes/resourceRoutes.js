const express  = require("express");
const multer   = require("multer");
const router   = express.Router();

const {
  getAllResources,
  uploadPdf,
  createResource,
  deleteResource,
} = require("../controllers/resourceController");

const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

// Multer — store file in memory (buffer), max 20 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files are allowed."));
  },
});

router.use(verifyToken);

router.get("/",            getAllResources);
router.post("/upload-pdf", upload.single("pdf"), uploadPdf);  // NEW
router.post("/",           createResource);
router.delete("/:id",      isAdmin, deleteResource);

module.exports = router;