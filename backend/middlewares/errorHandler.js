const errorHandler = (err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    message: err.message,
  });
};

const notFound = (req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
};

module.exports = { errorHandler, notFound };
