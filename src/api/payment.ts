import express from "express";
import isAuthenticated from "./middleware/authentication-middleware";
import { createCheckoutSession,retrieveSessionStatus } from "../application/payment";

const paymentRouter = express.Router();

paymentRouter
    .route("/create-checkout-session")
    .post(isAuthenticated, createCheckoutSession);

paymentRouter
    .route("/session-status")
    .get(isAuthenticated, retrieveSessionStatus);

export default paymentRouter;