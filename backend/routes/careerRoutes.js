// backend/routes/careerRoutes.js
const express = require("express");
const { createApplication, listMyApplications, getApplication } = require("../controllers/careerController");
const router = express.Router();

router.post("/", createApplication);
router.get("/", listMyApplications);
router.get("/:id", getApplication);

module.exports = router;