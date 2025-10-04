import isAuthenticated from "./middleware/authentication-middleware";
import express from "express";
import {createBooking,getAllBookingsForHotel,getAllBookings,getBookingById,getBookingsForUser} from "../application/booking"

const bookingRouter = express.Router();
bookingRouter
    .route("/")
    .post(isAuthenticated, createBooking)
    .get(isAuthenticated, getAllBookings);

bookingRouter
    .route("/hotels/:hotelId")
    .get(isAuthenticated, getAllBookingsForHotel);

bookingRouter
    .route("/:bookingId")
    .get(isAuthenticated, getBookingById);

bookingRouter
    .route("/user/:userId")
    .get(isAuthenticated, getBookingsForUser);

export default bookingRouter;