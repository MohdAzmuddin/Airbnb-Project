const mongoose = require("mongoose");
const listingSchema = new mongoose.Schema({
    title:{
             type:String,
             required:true,
    },
    description:String,
    image: {
        url: {
            type: String,
            default: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YmVhY2glMjBob3VzZXxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=800&q=60",
        },
        filename:String,
    },
    price:Number,
    location:String,
    country:String,
    reviews:[
        {
            type: mongoose.Schema.Types.ObjectId,
            ref:"Review",
        }
    ],
    owner:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"User",
    },
    geometry :{
       type:{
        type:String,
        enum:['Point'],
        required:true,
       },
       coordinates:{
        type:[Number],
        required:true
       }
    },
    
});

const listing = mongoose.model("listing",listingSchema);
module.exports = listing;