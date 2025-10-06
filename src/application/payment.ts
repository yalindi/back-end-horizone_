import { Request,Response,NextFunction } from "express";
import util from "util";
import stripe from "../infrastructure/stripe";
import Booking from "../infrastructure/entities/Booking";
import Hotel from "../infrastructure/entities/Hotel";
import { create } from "domain";
import { ClientSecrets } from "openai/resources/realtime/client-secrets";
import { stat } from "fs";
import { custom } from "zod";

const FRONTEND_URL = process.env.CORS_ORIGIN;
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

export const createCheckoutSession = async (
  req: Request,
  res: Response
) => {
    try{
        const bookingid =req.body.bookingId as string;
        const booking = await Booking.findById(bookingid);
        if(!booking){
            return res.status(404).json({message:"Booking not found"});
        }

        if(booking.paymentStatus==="PAID"){
            return res.status(400).json({message:"Booking is already paid"});
        }

        const hotel = await Hotel.findById(booking.hotelId);
        if(!hotel || !hotel.stripePriceId){
            return res.status(404).json({message:"Hotel not found" });
        }

        const checkIn=new Date(booking.checkIn);
        const checkOut=new Date(booking.checkOut);
        const NumberOfNights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

        if (!hotel.stripePriceId) {
            return res.status(400).json({ message: "Hotel does not have a Stripe price ID" });
        }
        const lineItem={
            price: hotel.stripePriceId,
            quantity: NumberOfNights,
        } as const;
        const session = await stripe.checkout.sessions.create({
            ui_mode:"embedded",
            line_items:[lineItem],
            mode:"payment",
            return_url:`${FRONTEND_URL}/booking/complete?session_id={CHECKOUT_SESSION_ID}`,
            metadata:{bookingid:booking._id.toString()},
        });
        res.send({clientSecret:session.client_secret});
    }
    catch(error){
        console.error("Error creating checkout session:",error);
        res.status(500).json({message:"Failed to create checkout session"});
    }
};


export const retrieveSessionStatus = async (
  req: Request,
  res: Response
) => {
    try{
        const sessionId = req.query.sessionId as string;
        const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
        const booking=await Booking.findById(checkoutSession.metadata?.bookingid);
        if(!booking){
            return res.status(404).json({message:"Booking not found"});
        }
        const hotel = await Hotel.findById(booking.hotelId);
        if(!hotel){
            return res.status(404).json({message:"Hotel not found" });
        }
        // if(checkoutSession.payment_status==="paid" && booking.paymentStatus !=="PAID"){
        //     await Booking.findByIdAndUpdate(booking._id,{paymentStatus:"PAID"});
        // }

        if(checkoutSession.payment_status==="paid" && booking.paymentStatus !=="PAID"){
            const result= await Booking.findOneAndUpdate(
                {_id:booking._id, paymentStatus:"PENDING"},
                {paymentStatus:"PAID"},
                {new:true}
            );
            if(!result){
                console.log("Booking payment status was already updated");
            }
        }

        res.status(200).json({
            bookingId:booking._id,
            booking,
            hotel,
            status: checkoutSession.payment_status,
            customerEmail: checkoutSession.customer_details?.email,
            paymentStatus:booking.paymentStatus,
        });
    }
    catch(error){
        console.error("Error retrieving checkout session:",error);
        res.status(500).json({message:"Failed to retrieve checkout session"});
    }
};

async function fullfillCheckout(session_id:string) {
    console.log("Fulfilling order for session:",session_id);
    const checkoutSession = await stripe.checkout.sessions.retrieve(session_id, {
        expand: ['line_items'],
    });
    console.log("Checkout session details:",util.inspect(checkoutSession,false,null,true));
    const booking=await Booking.findById(checkoutSession.metadata?.bookingid);
    if(!booking){
        throw new Error("Booking not found");
    }
    if(booking.paymentStatus==="PENDING"){
        return;
    }
    if(checkoutSession.payment_status !=="unpaid"){
        await Booking.findByIdAndUpdate(booking._id,{paymentStatus:"PAID"});
    }
        
}



export const handleWebhook = async (
  req: Request,
  res: Response
)=> {
    const payload=req.body as Buffer;
    const sig=req.headers["stripe-signature"] as string;
    let event;
    try{
        event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
        if(event.type==="checkout.session.completed"|| event.type==="checkout.session.async_payment_succeeded"){
            await fullfillCheckout((event.data.object as any).id); 
            res.status(200).send();
            return;
        }
        res.status(200).send();
        return;
    }
    catch(err){
        console.error("Webhook signature verification failed.",err);
        res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        return;
    }
};



           
        


