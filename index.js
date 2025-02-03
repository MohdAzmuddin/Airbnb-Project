if(process.env.NODE_ENV !="production"){
require("dotenv").config();
}

const express  = require("express");// connect express  packaage
const k = express();
const mongoose = require("mongoose");//connect mongoose package
const Listing = require("./Models/listing.js");
const path = require("path");// setup path views
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");// help to create many layout or template
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const {listingSchema,reviewSchema} = require("./schema.js");
const Review = require("./Models/review.js");
const session = require("express-session");
const passport = require("passport");
const localStrategy = require("passport-local");
const User = require("./Models/user.js");
const flash = require("connect-flash");
const {isLoggedIn, saveRedirectUrl, isOwner}  =require("./views/middleware.js");
const multer = require("multer");
const {storage}  =require("../MajorProject/cloudConfig.js");
const upload = multer({storage});

// for map 
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const { access } = require("fs");
const mapToken  = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({accessToken:mapToken});

k.set("view engine","ejs");
k.set("views",path.join(__dirname,"views"));
k.use(express.urlencoded({extended:true}));// by using this we use req.params every data come in request will pass 
k.use(methodOverride("_method"));
k.engine("ejs",ejsMate);
k.use(express.static(path.join(__dirname,"public")));// link style.css
k.use(express.static('public'));
k.use(flash());

// const sessionOption = {
//     secret:"mysupersecretcode",
//     resave:false,
//     saveUninitialized:true,
//     cookie:{
//         expires:Date.now() + 7 * 24 *60 * 60 *1000,
//         maxAge:7 * 24 * 60 * 60 * 1000,
//         httpOnly:true
//     },
// };

k.use(session(
    { secret: 'your_secret_key', 
     resave: false, 
     saveUninitialized: false })); 

    k.use(flash("hello world"));



//k.use(session(sessionOption));
k.use(flash());
 k.use(passport.initialize());
 k.use(passport.session());
 passport.use(new localStrategy(User.authenticate()));
 passport.serializeUser(User.serializeUser());
 passport.deserializeUser(User.deserializeUser());

 // for flash
 k.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    res.locals.currentUser = req.user; // For checking if a user is logged in
    next();
});

//connect database
main()
.then(()=>{console.log("connection successful");})
.catch((err)=>{console.log(err);});

async function main(){
    await mongoose.connect("mongodb://127.0.0.1:27017/Airbnb");
}


k.get("/",(req,res)=>{
    res.send("hello");
});



// for signup form 
 
k.get("/signup",(req,res)=>{
      res.render("signup.ejs");
 });

 k.post("/signup",async(req,res)=>{
    let{username,email,password} = req.body;
    const newUser = new User({email,username});
    const registerUser = await User.register(newUser,password);
    console.log(registerUser);
    // automatically log in vanish when we sign up
    req.login(registerUser,(err) =>{
        if(err){
            return next(err);
        }
        res.redirect("/listing");
    });
 });

// for login user

k.get("/login",(req,res)=>{
   // req.flash("success","login successful");
    res.render("login.ejs");
});

k.post("/login",saveRedirectUrl, passport.authenticate("local",{
    failureRedirect:"/login",
    failureFlash:true,
}),
async(req,res)=>{
    //req.flash("success", "welcome back");
    let redirectUrl = res.locals.redirectUrl || "/listing";
    res.redirect(redirectUrl);
});

// for logout
k.get("/logout", (req, res, next) => {
    req.logout((err) => {  
        if (err) {
            return next(err);
        }
        res.redirect("/login");
    });
});



const validateListing = (req,res,next) =>{
    let {error} = listingSchema.validate(req.body);
    if(error){
        let errMsg = error.details.map((el)=> el.message).join(",");
       throw new ExpressError(400,errMsg);
    }
    else{
        next();
    }
}


const validateReview = (req,res,next) =>{
    let {error} = reviewSchema.validate(req.body);
    if(error){
        let errMsg = error.details.map((el)=> el.message).join(",");
       throw new ExpressError(400,errMsg);
    }
    else{
        next();
    }
}
//indexx route
k.get("/listing", wrapAsync(async (req,res)=>{
   const allListing =  await Listing.find({});
   res.render("index.ejs",{allListing});
}));

//new route
k.get("/listing/new", isLoggedIn,(req,res)=>{
    res.render("new.ejs");
});

//show route
k.get("/listing/:id",wrapAsync(async (req,res)=>{
    let {id} = req.params;
   const listing  = await Listing.findById(id).populate("owner");
   res.render("show.ejs",{listing});
}));

// create route
 k.post("/listing",isLoggedIn, upload.single("listing[image]"),validateListing, wrapAsync(async(req,res,next)=>{ //wrapasync is better to way to write try catch 
    // for geocoding location
    let response = await geocodingClient.forwardGeocode({
        query:req.body.listing.location,
        limit: 1,
      })
        .send()
    
    
    
    
    let url = req.file.path; 
    let filename = req.file.filename; 
    const  newListing  = new Listing(req.body.listing);
     newListing.owner = req.user._id;// for creating new list then owener id automatically add 
    newListing.image = {url,filename};

    newListing.geometry = response.body.features[0].geometry;

    let savedListing = await newListing.save();
   /* req.flash("success","New Listing creating...")
    */res.redirect("/listing");
 }));
 
// edit route
k.get("/listing/:id/edit",isLoggedIn,isOwner,wrapAsync(async (req,res)=>{
    let {id} = req.params;
   const listing  = await Listing.findById(id);
   // for image size fized
   let originalImageUrl = listing.image.url;
   originalImageUrl = originalImageUrl.replace("/upload","/upload/h_300,w_250");
    res.render("edit.ejs",{listing,originalImageUrl});
}));

// update route
k.put("/listing/:id",isLoggedIn, isOwner, upload.single("listing[image]"),validateListing,  wrapAsync(async (req,res)=>{
    let {id} = req.params;
   let listing =  await Listing.findByIdAndUpdate(id,{...req.body.listing});
   if(typeof req.file !== "undefined"){
   let url = req.file.path; 
   let filename = req.file.filename;
   listing.image = {url,filename};
   await listing.save();
   }
    res.redirect("/listing")
}));

//delete route
k.delete("/listing/:id",isLoggedIn,isOwner,wrapAsync(async (req,res)=>{
    let {id}  = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id);
    res.redirect("/listing");
}));

k.all("*",(req,res,next)=>{
    next(new ExpressError(404,"page not found!"));
});

k.use((err,req,res,next)=>{
    let{statusCode=500,message="something wrong"} = err;
    res.status(statusCode).render("error.ejs",{message});
    //res.status(statusCode).send(message);
});

//review
//post route
k.post("/listing/:id/reviews", validateReview, wrapAsync(async (req,res)=>{
    let listing = await Listing.findById(req.params.id);
    let newReview = new Review(req.body.review);
    listing.review.push(newReview);
    await newReview.save();
    await listing.save();
    res.redirect(`/listing/${listing._id}`);
}));




k.listen(10000,()=>{console.log("listening ");});