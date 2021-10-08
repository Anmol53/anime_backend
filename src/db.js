const mongoose = require("mongoose");

const mongoURI =
  "mongodb+srv://anmol:cLgnWGIybF1ttyTn@cluster0.hh1mz.mongodb.net/Anime?retryWrites=true&w=majority";
mongoose
  .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("Connection established with mongodb server 🤗");
  })
  .catch((err) => {
    console.log("Error while connection 😑", err);
  });

const reviewSchema = new mongoose.Schema({
  description: String,
  rating: Number,
  creationTime: Date,
  anime_id: Number,
  user_id: mongoose.Schema.Types.ObjectId
});

const userSchema = new mongoose.Schema({
  user_name: String,
  first_name: String,
  last_name: String,
  user_mail: String,
  password: String
});

const Review = mongoose.model("Review", reviewSchema);
const User = mongoose.model("User", userSchema);

module.exports.Review = Review;
module.exports.User = User;
