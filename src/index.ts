import "dotenv/config";

import express from "express";
import cors from "cors";

import hotelsRouter from "./api/hotel";
import connectDB from "./infrastructure/db";
import reviewRouter from "./api/review";
import locationsRouter from "./api/location";
import bookingRouter from "./api/booking";
import paymentRouter from "./api/payment";
import globalErrorHandlingMiddleware from "./api/middleware/global-error-handling-middleware";

import { clerkMiddleware } from "@clerk/express";
import bodyParser from "body-parser";
import { handleWebhook } from "./application/payment";

const app = express();

app.post(
  "api/stripe/webhook",
  bodyParser.raw({ type: "application/json" }),
  handleWebhook
)

// Convert HTTP payloads into JS objects
app.use(express.json());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
  })
);

app.use(clerkMiddleware());


app.use("/api/hotels", hotelsRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/locations", locationsRouter);
app.use("/api/bookings", bookingRouter);
app.use("/api/payments", paymentRouter);


app.use(globalErrorHandlingMiddleware);

connectDB();

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log("Server is listening on PORT: ", PORT);
});