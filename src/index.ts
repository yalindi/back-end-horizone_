import "dotenv/config";

import express from "express";
import cors from "cors";

import hotelsRouter from "./api/hotel";
import connectDB from "./infrastructure/db";
import reviewRouter from "./api/review";
import locationsRouter from "./api/location";
import globalErrorHandlingMiddleware from "./api/middleware/global-error-handling-middleware";

import { clerkMiddleware } from "@clerk/express";

const app = express();

// Convert HTTP payloads into JS objects
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(clerkMiddleware());

// app.use((req, res, next) => {
//   console.log(req.method, req.url);
//   next();
// });

app.use("/api/hotels", hotelsRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/locations", locationsRouter);


app.use(globalErrorHandlingMiddleware);

connectDB();

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log("Server is listening on PORT: ", PORT);
});