const mongoose = require("mongoose");
const initData  =require("./data.js");
const Listing = require("../Models/listing.js");

//connect database
main()
.then(()=>{console.log("connection successful");})
.catch((err)=>{console.log(err);});

async function main(){
    await mongoose.connect("mongodb://127.0.0.1:27017/Airbnb");
}

const initDB = async ()=>{
    await Listing.deleteMany({});// delete all 
    initData.data = initData.data.map((obj=>({...obj,owner:"6799c34794060f1780837f71"})));
    await Listing.insertMany(initData.data); // insert all data from data.js file
    console.log("data was initialized");
};

initDB();