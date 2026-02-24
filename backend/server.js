import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db.js";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.js";
import saveTimetableRoute from "./routes/saveTimetable.js";
import timetableRoutes from "./routes/timetables.js";
import shareRoutes from "./routes/share.js";
import exportRoutes from "./routes/export.js";
import publishedExportRoutes from "./routes/publishedExport.js";
import sessionRoutes from "./routes/sessions.js";
import draftRoutes from "./routes/draft.js";
import publishedTimetableRoutes from "./routes/publishedTimetable.js";

dotenv.config();
connectDB();

const app = express();

const allowedOrigins = (process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) => {
  const startedAt = Date.now();
  console.info(`[http] ${req.method} ${req.originalUrl}`);

  res.on("finish", () => {
    console.info(
      `[http] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - startedAt}ms)`
    );
  });

  next();
});

app.get("/", (req, res) => {
  res.send("time-table3o backend alive");
});

app.use("/auth", authRoutes);
app.use("/draft", draftRoutes);
app.use("/save-timetable", saveTimetableRoute);
app.use("/timetables", timetableRoutes);
app.use("/share", shareRoutes);
app.use("/export", exportRoutes);
app.use("/export", publishedExportRoutes);
app.use("/sessions", sessionRoutes);
app.use("/timetable", publishedTimetableRoutes);
app.use((req, res) => {
  console.warn(`[http] Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ status: "NOT_FOUND", message: "Route not found" });
});

const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`server running on ${HOST}:${PORT}`);
});
