const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const articleRoutes = require("./routes/articleRoutes");
const authorRoutes = require("./routes/authorRoutes");
const journalRoutes = require("./routes/journalRoutes");
const conferenceRoutes = require("./routes/conferenceRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const reviewerRoutes = require("./routes/reviewerRoutes");
const userRoutes = require("./routes/userRoutes");
const statsRoutes = require("./routes/statsRoutes");
const citationRoutes = require("./routes/citationRoutes"); // NEW

const { errorHandler, notFound } = require("./middlewares/errorHandler");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/articles", articleRoutes);
app.get(
  "/api/articles/:id/reviews",
  require("./controllers/reviewController").getReviewsByArticle
);
app.use("/api/authors", authorRoutes);
app.use("/api/journals", journalRoutes);
app.use("/api/conferences", conferenceRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/reviewers", reviewerRoutes);
app.use("/api/users", userRoutes);
app.use("/api", statsRoutes);
app.use("/api/citations", citationRoutes); // NEW - Citation routes

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api/articles`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
});
