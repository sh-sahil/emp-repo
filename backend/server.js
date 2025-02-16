// Express Backend (server.js)
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// User Schema
const UserSchema = new mongoose.Schema({
  name: String,
  password: String,
  gender: String,
  company: String,
  married: Boolean,
  familyIncome: Number,
  tax_details_id: String,
  goals: [String],
});
const User = mongoose.model("User", UserSchema);

// Register User
app.post("/register", async (req, res) => {
  const { name, password, gender, company } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({
    name,
    password: hashedPassword,
    gender,
    company,
    married: false,
    familyIncome: 0,
    goals: [],
    tax_details_id: null,
  });
  await user.save();
  res.status(201).json({ message: "User Registered" });
});

// Login User
app.post("/login", async (req, res) => {
  const { name, password } = req.body;
  const user = await User.findOne({ name });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: "Invalid Credentials" });
  }
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  res.json({ token, user });
});

// Get User Profile
app.get("/profile", async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
  const { id } = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(id);
  res.json(user);
});

// Update Profile
app.put("/profile", async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
  const { id } = jwt.verify(token, process.env.JWT_SECRET);
  await User.findByIdAndUpdate(id, req.body);
  res.json({ message: "Profile Updated" });
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
