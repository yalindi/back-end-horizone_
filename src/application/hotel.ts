import Hotel from "../infrastructure/entities/Hotel";
import NotFoundError from "../domain/errors/not-found-error";
import ValidationError from "../domain/errors/validation-error";
import { generateEmbedding } from "./utils/embeddings";
import stripe from "../infrastructure/stripe";
import { CreateHotelDTO, SearchHotelDTO } from "../domain/dtos/hotel";
import { Request, Response, NextFunction } from "express";
import { getErrorMap } from "zod";


export const getAllHotels = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const hotels = await Hotel.find();
    res.status(200).json(hotels);
    return;
  } catch (error) {
    next(error);
  }
};


export const getAllHotelsWithFilters = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log('Raw query params:', req.query);

    const {
      page = 1,
      limit = 12,
      location,
      minPrice,
      maxPrice,
      sortBy = 'featured',
      search
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 12));
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};

    if (location) {
      let locationNames: string[] = [];
      if (typeof location === "string") {
        locationNames = location.split(',').map(loc => loc.trim()).filter(loc => loc);
      }

      if (locationNames.length > 0) {
        query.location = {
          $in: locationNames.map(name => new RegExp(name, 'i'))
        };
        console.log(query.location);
      }
    }

    // FIXED: Price range with validation
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice && !isNaN(Number(minPrice))) {
        query.price.$gte = Number(minPrice);
      }
      if (maxPrice && !isNaN(Number(maxPrice))) {
        query.price.$lte = Number(maxPrice);
      }
      // Remove if no valid prices
      if (Object.keys(query.price).length === 0) {
        delete query.price;
      }
    }

    // Search filter
    if (search && typeof search === 'string') {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Sort options
    let sortOptions: any = {};
    switch (sortBy) {
      case 'price_low': sortOptions = { price: 1 }; break;
      case 'price_high': sortOptions = { price: -1 }; break;
      case 'rating': sortOptions = { rating: -1 }; break;
      case 'name': sortOptions = { name: 1 }; break;
      default: sortOptions = { createdAt: -1 };
    }

    const [hotels, totalCount] = await Promise.all([
      Hotel.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .populate('reviews'),
      Hotel.countDocuments(query)
    ]);

    res.status(200).json({
      hotels,
      totalCount,
      totalPages: Math.ceil(totalCount / limitNum),
      currentPage: pageNum,
      hasNextPage: pageNum * limitNum < totalCount,
      hasPrevPage: pageNum > 1
    });

  } catch (error) {
    console.error('Error in getAllHotelsWithFilters:', error);
  }
};
export const createHotel = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const hotelData = req.body;
    const result = CreateHotelDTO.safeParse(hotelData);

    if (!result.success) {
      throw new ValidationError(`${result.error.message}`);
    }

    const embedding = await generateEmbedding(
      `${result.data.name} ${result.data.description} ${result.data.location} ${result.data.price}`
    );

    // Create Stripe product with default price for the nightly rate
    const product = await stripe.products.create({
      name: result.data.name,
      description: result.data.description,
      default_price_data: {
        unit_amount: Math.round(result.data.price * 100),
        currency: "usd",
      },
    });

    const defaultPriceId =
      typeof product.default_price === "string"
        ? product.default_price
        : (product.default_price as any)?.id;

    await Hotel.create({
      ...result.data,
      embedding,
      stripePriceId: defaultPriceId,
    });
    res.status(201).send();
  } catch (error) {
    next(error);
  }
};

export const getHotelLocations = async (
  req: Request,
  res: Response,
  next: NextFunction

) => {
  try {
    const locations = await Hotel.distinct('location');
    const locationObjects = locations.map((name, index) => ({
      _id: (index + 1).toString(),
      name
    }))
    res.status(200).json(locationObjects)
    return
  } catch (error) {
    next(error)
  }

};

export const getAllHotelsBySearch = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = SearchHotelDTO.safeParse(req.query);
    if (!result.success) {
      throw new ValidationError(`${result.error.message}`);
    }
    const { query } = result.data;

    const queryEmbedding = await generateEmbedding(query);

    const hotels = await Hotel.aggregate([
      {
        $vectorSearch: {
          index: "hotel_vector_index",
          path: "embedding",
          queryVector: queryEmbedding,
          numCandidates: 25,
          limit: 4,
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          location: 1,
          price: 1,
          image: 1,
          rating: 1,
          reviews: 1,
          score: { $meta: "vectorSearchScore" },
        },
      },
    ]);

    res.status(200).json(hotels);
  } catch (error) {
    next(error);
  }
};



export const getHotelById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const _id = req.params._id;
    const hotel = await Hotel.findById(_id);
    if (!hotel) {
      throw new NotFoundError("Hotel not found");
    }
    res.status(200).json(hotel);
  } catch (error) {
    next(error);
  }
};

export const updateHotel = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const _id = req.params._id;
    const hotelData = req.body;
    if (
      !hotelData.name ||
      !hotelData.image ||
      !hotelData.location ||
      !hotelData.price ||
      !hotelData.description
    ) {
      throw new ValidationError("Invalid hotel data");
    }

    const hotel = await Hotel.findById(_id);
    if (!hotel) {
      throw new NotFoundError("Hotel not found");
    }

    await Hotel.findByIdAndUpdate(_id, hotelData);
    res.status(200).json(hotelData);
  } catch (error) {
    next(error);
  }
};

export const patchHotel = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const _id = req.params._id;
    const hotelData = req.body;
    if (!hotelData.price) {
      throw new ValidationError("Price is required");
    }
    const hotel = await Hotel.findById(_id);
    if (!hotel) {
      throw new NotFoundError("Hotel not found");
    }
    await Hotel.findByIdAndUpdate(_id, { price: hotelData.price });
    res.status(200).send();
  } catch (error) {
    next(error);
  }
};

export const deleteHotel = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const _id = req.params._id;
    const hotel = await Hotel.findById(_id);
    if (!hotel) {
      throw new NotFoundError("Hotel not found");
    }
    await Hotel.findByIdAndDelete(_id);
    res.status(200).send();
  } catch (error) {
    next(error);
  }
};

export const createHotelStripePrice = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const _id = req.params._id;
    const hotel = await Hotel.findById(_id);
    if (!hotel) {
      throw new NotFoundError("Hotel not found");
    }

    // Create a product with default price for the hotel's nightly rate
    const product = await stripe.products.create({
      name: hotel.name,
      description: hotel.description,
      default_price_data: {
        unit_amount: Math.round(hotel.price * 100),
        currency: "usd",
      },
    });

    const defaultPriceId =
      typeof product.default_price === "string"
        ? product.default_price
        : (product.default_price as any)?.id;

    const updated = await Hotel.findByIdAndUpdate(
      _id,
      { stripePriceId: defaultPriceId },
      { new: true }
    );

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};