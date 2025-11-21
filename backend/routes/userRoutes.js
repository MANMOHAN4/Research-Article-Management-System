const express = require("express");
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  updateUser,
  updatePassword,
  deleteUser,
} = require("../controllers/userController");

router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.put("/:id/password", updatePassword);
router.delete("/:id", deleteUser);

module.exports = router;
