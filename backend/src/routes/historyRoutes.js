const { Router } = require("express");
const { body, param, query } = require("express-validator");
const authMiddleware = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");
const historyController = require("../controllers/historyController");

const router = Router();

router.use(authMiddleware);

router.post(
  "/",
  [
    body("queryText")
      .trim()
      .isLength({ min: 1, max: 5000 })
      .withMessage("queryText is required and must be shorter than 5000 characters"),
    body("responseText")
      .optional({ nullable: true })
      .isLength({ max: 10000 })
      .withMessage("responseText must be shorter than 10000 characters")
  ],
  validateRequest,
  historyController.createHistoryItem
);

router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100")
  ],
  validateRequest,
  historyController.getHistory
);

router.get(
  "/:id",
  [param("id").isUUID().withMessage("Valid history id is required")],
  validateRequest,
  historyController.getHistoryItem
);

router.delete(
  "/:id",
  [param("id").isUUID().withMessage("Valid history id is required")],
  validateRequest,
  historyController.deleteHistoryItem
);

module.exports = router;
