import express from "express";
import isAuthenticated from "./middleware/authentication-middleware";
import { createCheckoutSession,retrieveSessionStatus } from "../application/payment";

const paymentRouter = express.Router();

paymentRouter
    .route("/payments/create-checkout-session")
    .post(isAuthenticated, createCheckoutSession);

paymentRouter
    .route("/payments/session-status")
    .get(isAuthenticated, retrieveSessionStatus);

export default paymentRouter;