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

export const getBookingsForUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const requestedUserId=req.params.userId;

    const { userId:authUserId } = getAuth(req);
    if (requestedUserId!==authUserId) {
      throw new UnauthorizedError("Unauthorized");
    }

    const bookings = await Booking.find({userId:requestedUserId })
      .populate("hotelId")
      .sort({ createdAt: -1 });

    res.status(200).json(bookings);
  }
  catch (error) {
    next(error);
  }
}

