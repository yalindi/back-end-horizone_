// import { Request, Response, NextFunction } from "express";
// import Booking from "../infrastructure/entities/Booking";
// import { CreateBookingDTO } from "../domain/dtos/booking";

// import ValidationError from "../domain/errors/validation-error";
// import NotFoundError from "../domain/errors/not-found-error";
// import Hotel from "../infrastructure/entities/Hotel";
// import UnauthorizedError from "../domain/errors/unauthorized-error";
// import {getAuth} from '@clerk/express'

// export const createBooking = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const CreateBookingData = CreateBookingDTO.parse(req.body);
//     if (!CreateBookingData) {
//       throw new ValidationError("Invalid booking data");
//     }
//     const {userId} = getAuth(req);
//     if(!userId){
//       throw new UnauthorizedError("Unauthorized");
//     }
//     const hotel = await Hotel.findById(CreateBookingData.hotelId);
//     if (!hotel) {
//       throw new NotFoundError("Hotel not found");
//     }
//     const newBooking = new Booking({
//       hotelId:Booking.data.hotelId,
//       userId:userId,
//       checkIn:booking.data.checkIn,
//       checkOut:booking.data.checkOut,
//       roomNumber:await(async()=>{
//         let roomNumber:number|undefined=undefined;
//         let isRoomTaken=true;
//         while(isRoomTaken){
//           roomNumber=Math.floor(Math.random()*(hotel.rooms.length))+1;
//           const existingBooking=await Booking.findOne({


import { NextFunction, Request, Response } from "express";

import Booking from "../infrastructure/entities/Booking";
import { CreateBookingDTO } from "../domain/dtos/booking";
import ValidationError from "../domain/errors/validation-error";
import NotFoundError from "../domain/errors/not-found-error";
import Hotel from "../infrastructure/entities/Hotel";
import { getAuth } from "@clerk/express";
import UnauthorizedError from "../domain/errors/unauthorized-error";

export const createBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const booking = CreateBookingDTO.safeParse(req.body);
    if (!booking.success) {
      throw new ValidationError(booking.error.message);
    }

    const { userId } = getAuth(req);
    if (!userId) {
      throw new UnauthorizedError("Unauthorized");
    }

    const hotel = await Hotel.findById(booking.data.hotelId);
    if (!hotel) {
      throw new NotFoundError("Hotel not found");
    }

    const newBooking = await Booking.create({
      hotelId: booking.data.hotelId,
      userId: userId,
      checkIn: booking.data.checkIn,
      checkOut: booking.data.checkOut,
      roomNumber: await (async () => {
        let roomNumber: number | undefined = undefined;
        let isRoomAvailable = false;
        while (!isRoomAvailable) {
          roomNumber = Math.floor(Math.random() * 1000) + 1;
          const existingBooking = await Booking.findOne({
            hotelId: booking.data.hotelId,
            roomNumber: roomNumber,
            $or: [
              {
                checkIn: { $lte: booking.data.checkOut },
                checkOut: { $gte: booking.data.checkIn },
              },
            ],
          });
          isRoomAvailable = !existingBooking;
        }
        return roomNumber;
      })(),
    });

    res.status(201).json(newBooking);
    return;
  } catch (error) {
    next(error);
  }
};

export const getAllBookingsForHotel = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const hotelId = req.params.hotelId;
    const bookings = await Booking.find({ hotelId: hotelId });
    res.status(200).json(bookings);
    return;
  } catch (error) {
    next(error);
  }
};

export const getAllBookings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const bookings = await Booking.find();
    res.status(200).json(bookings);
    return;
  } catch (error) {
    next(error);
  }
};

export const getBookingById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const bookingId = req.params.bookingId;
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new NotFoundError("Booking not found");
    }
    res.status(200).json(booking);
    return;
  } catch (error) {
    next(error);
  }
};