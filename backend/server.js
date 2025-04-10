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

const UserSchema = new mongoose.Schema({
  name: String,
  password: String,
  gender: String,
  company: String,
  married: Boolean,
  familyIncome: Number,
  tax_details_id: String,
  goals: [String],
  salaryDetails_id: String,
  propertyDetails_id: String,
  agricultureDetails_id: String,
  capitalGainsDetails_id: String,
  otherDetails_id: String,
  taxComparison_id: {
    // Added field to store the most recent tax comparison ID
    type: mongoose.Schema.Types.ObjectId,
    ref: "TaxComparison",
    default: null,
  },
});
const User = mongoose.model("User", UserSchema);

const TaxDetailsSchema = new mongoose.Schema({
  assessment_year: String,
  gross_salary: String,
  hra: String,
  travel_allowance: String,
  gratuity: String,
  leave_encashment: String,
  standard_deduction: Number,
  professional_tax: String,
  other_income: String,
  section_80C: String,
  section_80CCC: String,
  section_80D: String,
  section_80E: String,
  section_80G: String,
  section_80TTA: String,
  rebate_87A: String,
  additional_cess_info: String,
});

const TaxDetails = mongoose.model("TaxDetails", TaxDetailsSchema, "tax_details");

const TaxComparisonSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true,
  },
  response: {
    type: String,
    required: true,
    trim: true,
  },
  generatedAt: {
    type: Date,
    default: Date.now,
  },
});

const TaxComparison = mongoose.model("TaxComparison", TaxComparisonSchema, "response_details");

const SalaryDetailsSchema = new mongoose.Schema({
  back_pay: Number,
  hrm: Number,
  ltm: Number,
  medical_allowance: Number,
  transport: Number,
  conveyance: Number,
  uniform: Number,
  nps: Number,
});

const PropertyDetailsSchema = new mongoose.Schema({
  rent_evolved: Number,
  tax_paid: Number,
  property_loan_interest: Number,
});

const AgricultureDetailsSchema = new mongoose.Schema({
  income_earned: Number,
  expenses_incurred: Number,
});

const CapitalGainsDetailsSchema = new mongoose.Schema({
  shares: Number,
  equity_mutual_funds: Number,
  real_estate: Number,
  gold: Number,
  listed_bonds: Number,
});

const OtherDetailsSchema = new mongoose.Schema({
  saving_bank_interest: Number,
  fd_interest: Number,
  dividend_report: Number,
  winning: Number,
  epp_acc: Number,
  other_income: Number,
});

const SalaryDetails = mongoose.model("SalaryDetails", SalaryDetailsSchema);
const PropertyDetails = mongoose.model("PropertyDetails", PropertyDetailsSchema);
const AgricultureDetails = mongoose.model("AgricultureDetails", AgricultureDetailsSchema);
const CapitalGainsDetails = mongoose.model("CapitalGainsDetails", CapitalGainsDetailsSchema);
const OtherDetails = mongoose.model("OtherDetails", OtherDetailsSchema);

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

// get all tax details
app.get("/tax-details", async (req, res) => {
  const taxDetails = await TaxDetails.find();
  res.json(taxDetails);
});

// get form 16 data
app.get("/form16", async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
  // console.log(token);
  const { id } = jwt.verify(token, process.env.JWT_SECRET);
  // console.log(id);
  const user = await User.findById(id);

  const form16 = await TaxDetails.findById(new mongoose.Types.ObjectId(user.tax_details_id));
  // console.log(form16);
  res.json(form16);
});

app.delete("/form16", async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
  const { id } = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(id).populate("tax_details_id");
  await User.findByIdAndUpdate(id, { tax_details_id: null });
  res.json({ message: "Form 16 Deleted" });
});

// Add Salary Details
app.post("/add-salary-details", async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
  const { id } = jwt.verify(token, process.env.JWT_SECRET);
  const salaryDetails = new SalaryDetails(req.body);
  await salaryDetails.save();
  await User.findByIdAndUpdate(id, { salaryDetails_id: salaryDetails._id });
  res.status(201).json({ message: "Salary Details Added" });
});

// Add Property Details
app.post("/add-property-details", async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
  // console.log(token);
  const { id } = jwt.verify(token, process.env.JWT_SECRET);
  const propertyDetails = new PropertyDetails(req.body);
  await propertyDetails.save();
  await User.findByIdAndUpdate(id, { propertyDetails_id: propertyDetails._id });
  res.status(201).json({ message: "Property Details Added" });
});

// Add Agriculture Details
app.post("/add-agriculture-details", async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
  const { id } = jwt.verify(token, process.env.JWT_SECRET);
  const agricultureDetails = new AgricultureDetails(req.body);
  await agricultureDetails.save();
  await User.findByIdAndUpdate(id, { agricultureDetails_id: agricultureDetails._id });
  res.status(201).json({ message: "Agriculture Details Added" });
});

// Add Capital Gains Details
app.post("/add-capital-gains-details", async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
  const { id } = jwt.verify(token, process.env.JWT_SECRET);
  const capitalGainsDetails = new CapitalGainsDetails(req.body);
  await capitalGainsDetails.save();
  await User.findByIdAndUpdate(id, { capitalGainsDetails_id: capitalGainsDetails._id });
  res.status(201).json({ message: "Capital Gains Details Added" });
});

// Add Other Details
app.post("/add-other-details", async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
  const { id } = jwt.verify(token, process.env.JWT_SECRET);
  const otherDetails = new OtherDetails(req.body);
  await otherDetails.save();
  await User.findByIdAndUpdate(id, { otherDetails_id: otherDetails._id });
  res.status(201).json({ message: "Other Details Added" });
});

// Get Salary Details
app.get("/salary-details", async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
  const { id } = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(id);
  const salaryDetails = await SalaryDetails.findById(user.salaryDetails_id);
  res.json(salaryDetails);
});

// Get Property Details
app.get("/property-details", async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
  const { id } = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(id);
  const propertyDetails = await PropertyDetails.findById(user.propertyDetails_id);
  res.json(propertyDetails);
});

// Get Agriculture Details
app.get("/agriculture-details", async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
  const { id } = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(id);
  const agricultureDetails = await AgricultureDetails.findById(user.agricultureDetails_id);
  res.json(agricultureDetails);
});

// Get Capital Gains Details
app.get("/capital-gains-details", async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
  const { id } = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(id);
  const capitalGainsDetails = await CapitalGainsDetails.findById(user.capitalGainsDetails_id);
  res.json(capitalGainsDetails);
});

// Get Other Details
app.get("/other-details", async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
  const { id } = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(id);
  const otherDetails = await OtherDetails.findById(user.otherDetails_id);
  res.json(otherDetails);
});

// Endpoint to retrieve the single latest tax comparison response for a user
app.get("/tax-comparison", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    // Check if token exists
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1]; // Extract token
    const { id } = jwt.verify(token, process.env.JWT_SECRET); // Verify token
    console.log("User ID:", id);
    // console.log(typeof id);

    const comparison = await TaxComparison.findOne({
      userId: id,
    }); // Fetch only one response

    console.log("Tax Comparison:", comparison);
    if (!comparison) {
      return res.status(404).json({ message: "No tax comparison found for this user" });
    }

    res.json(comparison);
  } catch (error) {
    console.error("Error fetching tax comparison:", error);
    res.status(500).json({ message: "Failed to fetch tax comparison" });
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
