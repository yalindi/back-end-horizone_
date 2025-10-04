import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
    rating:{
        type: Number,
        min: 1,
        max: 5,
        required: true,
    },
    comment:{
        type: String,
        required: true,
    },
    userId:{
        type: String,
        required: true,
    },
    // hotelId:{
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: "Hotel",
    //     required: true,
    // },
});

const Review = mongoose.model("Review", reviewSchema);
export default Review;