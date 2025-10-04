import { create } from "domain";
import e from "express";
import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
    userId:{
        type: String,
        required: true,
    },
    hotelId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Hotel",
        required: true,
    },
    checkIn: {
        type: Date,
        required: true,
    },
    checkOut: {
        type: Date,
        required: true,
    },
    roomNumber: {
        type: Number,
        required: true,
    },
    paymentStatus: {
        type: String,
        enum: ["PENDING","PAID"],  
        default: "PENDING",
    }      
});

bookingSchema.index({userId:1,createdAt:-1});
bookingSchema.index({hotelId:1})

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;