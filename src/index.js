const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const session = require("express-session");
const db = require("./db");

const app = express();

app.use(express.json());

app.use(
  cors({
    credentials: true,
    origin: "https://search-animes.herokuapp.com"
  })
);

app.set("trust proxy", 1);

app.use(
  session({
    secret: "cvdsgoki8rk8667o44r378",
    cookie: {
      maxAge: 1 * 60 * 60 * 1000, // 1 hour session
      sameSite: "none",
      secure: true
    }
  })
);

const { Review, User } = db;

const SALT = 8;

const isNullOrUndefined = (inp) => inp === null || inp === undefined;

const AuthMW = async (req, res, next) => {
  if (
    isNullOrUndefined(req.session) ||
    isNullOrUndefined(req.session.user_id)
  ) {
    res.status(401).send({
      status: "Unauthorized",
      message: "Not logged in"
    });
  } else {
    next();
  }
};

app.post("/signup", async (req, res) => {
  const { user_name, password } = req.body;
  if (
    isNullOrUndefined(user_name) ||
    user_name.length < 1 ||
    isNullOrUndefined(password) ||
    password.length < 1
  ) {
    res.status(400).send({
      status: "Bad Request",
      message: `User name and password are required fields`
    });
    return;
  }
  const existingUser = await User.findOne({ user_name });
  if (existingUser) {
    res.status(400).send({
      status: "Bad Request",
      message: `User name ${req.body.user_name} already exist!\nPlease choose another.`
    });
  } else {
    const hashedPassword = bcrypt.hashSync(req.body.password, SALT);
    const newUser = new User({
      ...req.body,
      password: hashedPassword
    });
    req.session.user_id = newUser._id;
    newUser.save();
    res.status(201).send({
      status: "Created",
      message: `User ${req.body.user_name} created!`
    });
  }
});

app.post("/login", async (req, res) => {
  const { user_name, password } = req.body;
  if (isNullOrUndefined(user_name) || isNullOrUndefined(password)) {
    res.status(400).send({
      status: "Bad Request",
      message: `User name and password are required fields`
    });
    return;
  }
  const existingUser = await User.findOne({ user_name });
  if (existingUser) {
    if (bcrypt.compareSync(req.body.password, existingUser.password)) {
      req.session.user_id = existingUser._id;
      res.status(200).send({
        status: "OK",
        message: `${req.body.user_name} Logged in!`
      });
    } else {
      res.status(401).send({
        status: "Unauthorized",
        message: `Incorrect Password`
      });
    }
  } else {
    res.status(401).send({
      status: "Unauthorized",
      message: `User name ${req.body.user_name} not found`
    });
  }
});

app.get("/logout", async (req, res) => {
  if (req.session) {
    req.session.destroy(() => {
      res.status(200).send({
        status: "OK",
        message: "Logged out"
      });
    });
  } else {
    res.status(400).send({
      status: "Bad Request",
      message: "No User Logged in"
    });
  }
});

app.get("/userDetails", AuthMW, async (req, res) => {
  const existingUser = await User.findById(req.session.user_id);
  res.status(200).send({
    status: "OK",
    message: `Fetched already Logged user!`,
    user: {
      user_name: existingUser.user_name,
      first_name: existingUser.first_name,
      last_name: existingUser.last_name,
      user_mail: existingUser.user_mail
    }
  });
});
// Create
app.post("/review", AuthMW, async (req, res) => {
  const newReview = new Review({
    description: req.body.description,
    rating: req.body.rating,
    creationTime: new Date(),
    anime_id: Number(req.body.anime_id),
    user_id: req.session.user_id
  });
  try {
    await newReview.save();
    res.status(200).send({
      status: "ok",
      message: "Review saved",
      review: newReview
    });
  } catch (e) {
    res.status(500).send({
      status: "Internal Server Error",
      message: "The server has encountered an error."
    });
  }
});

// Update
app.put("/review/:reviewId", AuthMW, async (req, res) => {
  const reviewId = req.params.reviewId;
  try {
    const review = await Review.findOne({
      _id: reviewId,
      user_id: req.session.user_id
    });
    if (isNullOrUndefined(review)) {
      res.status(404).send({
        status: "Not Found",
        message: `Review Not Found`
      });
      return;
    }
    if (req.body.description) {
      review.description = req.body.description;
    }
    if (req.body.rating) {
      review.rating = req.body.rating;
    }
    await review.save();
    res.status(200).send({
      status: "ok",
      message: `Successfully Updated`,
      review: review
    });
  } catch (e) {
    res.status(500).send({
      status: "Internal Server Error",
      message: `The server has encountered an error. ${e}`
    });
  }
});

// Delete
app.delete("/review/:reviewId", AuthMW, async (req, res) => {
  const reviewId = req.params.reviewId;
  try {
    await Review.deleteOne({
      _id: reviewId,
      user_id: req.session.user_id
    });

    res.status(200).send({
      status: "ok",
      message: `Successfully Deleted`
    });
  } catch (e) {
    res.status(500).send({
      status: "Internal Server Error",
      message: "The server has encountered an error."
    });
  }
});

// Sending all the reviews as an Array
app.get("/anime/:animeId", AuthMW, async (req, res) => {
  const animeId = Number(req.params.animeId);
  try {
    const reviews = await Review.find({ anime_id: animeId });
    let sum = 0;
    let count = 0;
    reviews.forEach(async (review) => {
      count++;
      sum += review.rating;
      console.log("Debugging 1: ", review);
      review.user_name = await User.findById(review.user_id).user_name;
      console.log("Debugging 2: ", review);
    });
    console.log("Debugging 3: ", reviews);
    res.status(200).send({
      status: "ok",
      message: `${reviews.length} reviews fetched`,
      reviews,
      overallRating: count === 0 ? 0 : sum / count
    });
  } catch (e) {
    res.status(500).send({
      status: "Internal Server Error",
      message: "The server has encountered an error."
    });
  }
});

app.get("/", (req, res) => {
  res.send("Server Running");
});

app.listen(process.env.PORT, () =>
  console.log(`Server is running at port ${process.env.PORT}`)
);
