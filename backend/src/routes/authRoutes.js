const { Router } = require("express");
const { body } = require("express-validator");
const authMiddleware = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");
const authController = require("../controllers/authController");

const router = Router();

const emailValidator = body("email").isEmail().withMessage("Valid email is required").normalizeEmail();
const passwordValidator = body("password")
  .isLength({ min: 8 })
  .withMessage("Password must be at least 8 characters long");
const nameValidator = body("name")
  .trim()
  .isLength({ min: 2, max: 80 })
  .withMessage("Name must be between 2 and 80 characters");

router.post(
  "/register",
  [emailValidator, passwordValidator, nameValidator],
  validateRequest,
  authController.register
);

router.post(
  "/login",
  [emailValidator, passwordValidator],
  validateRequest,
  authController.login
);

router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.get("/me", authMiddleware, authController.me);

module.exports = router;
