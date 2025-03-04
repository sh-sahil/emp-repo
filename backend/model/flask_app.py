from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import pdfplumber
import re
import os
import pymongo
from dotenv import load_dotenv
from bson import ObjectId
import csv
import jwt
import json
# Load environment variables
load_dotenv()

app = Flask(__name__)
# Update CORS configuration with specific settings
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:5173", "http://localhost:3000"],  # Allow frontend origins
        "methods": ["GET", "POST", "OPTIONS"],  # Explicitly allow methods
        "allow_headers": ["Content-Type", "Authorization"],  # Allow necessary headers
    }
})

# MongoDB Connection
client = pymongo.MongoClient(os.getenv("MONGO_URI"))
db = client["ipd"]
tax_collection = db["tax_details"]
user_collection = db["users"]

# Upload Folder
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER



  

### ------------------ PDF Extraction Logic ------------------ ###

def extract_form16_data(pdf_path):
    text = ""
    tables = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:  
            text += page.extract_text()
            tables.extend(page.extract_tables())
    return text, tables


def extract_tax_details(pdf_text, pdf_tables):
    def find_value(pattern, default="0"):
        match = re.search(pattern, pdf_text)
        return match.group(1).replace(',', '') if match else default
    
    # Extract values from text using regular expressions
    tax_details = {
        "assessment_year": find_value(r'Assessment Year\s+(\d{4}-\d{2})', "N/A"),
        "gross_salary": "0",
        "hra": "0",
        "travel_allowance": "0",
        "gratuity": "0",
        "leave_encashment": "0",
        "standard_deduction": 50000.0 if re.search(r'Standard Deduction\s+Yes', pdf_text) else 0.0,
        "professional_tax": "0",
        "other_income": "0",
        "section_80C": "0",
        "section_80CCC": "0",
        "section_80D": "0",
        "section_80E": "0",
        "section_80G": "0",
        "section_80TTA": "0",
        "rebate_87A": "0",
        "additional_cess_info": "0"
    }
    gross_salary_section = False
    
    table_readable_values = {
        "assessment_year_readable": "",
        "gross_salary_readable": "Gross Salary",
        "hra_readable": "House rent allowance under section 10(13A)",
        "travel_allowance_readable": "Travel concession or assistance under section 10(5)",
        "gratuity_readable": "Death-cum-retirement gratuity under section 10(10)",
        "leave_encashment_readable": "Cash equivalent of leave salary encashment under section 10\n(10AA)",
        # "standard_deduction_readable": 50000.0 if re.search(r'Standard Deduction\s+Yes', pdf_text) else 0.0,
        "professional_tax_readable": "Tax on employment under section 16(iii)",
        "other_income_readable": "Total amount of other income reported by the employee\n[7(a)+7(b)]",
        "section_80C_readable": "Deduction in respect of life insurance premia, contributions to\nprovident fund etc. under section 80C",
        "section_80CCC_readable": "Deduction in respect of contribution to certain pension funds\nunder section 80CCC",
        "section_80D_readable": "Deduction in respect of health insurance premia under section\n80D",
        "section_80E_readable": "Deduction in respect of interest on loan taken for higher\neducation under section 80E",
        "section_80G_readable": "Total Deduction in respect of donations to certain funds,\ncharitable institutions, etc. under section 80G",
        "section_80TTA_readable": "Deduction in respect of interest on deposits in savings account\nunder section 80TTA",
        "rebate_87A_readable": "Rebate under section 87A, if applicable",
        "additional_cess_info_readable": "Health and education cess"

    }
    
    # Extract values from tables
    for table in pdf_tables:
        for row in table:
            if table_readable_values["gross_salary_readable"] in row:
                gross_salary_section = True
            if  gross_salary_section and "Total" in row:
                    tax_details["gross_salary"] = row[row.index('Total') + 2]
                    gross_salary_section = False
            if table_readable_values["hra_readable"] in row:
                tax_details["hra"] = row[row.index(table_readable_values["hra_readable"]) + 1].replace(',', '')
            if table_readable_values["travel_allowance_readable"] in row:
                tax_details["travel_allowance"] = row[row.index(table_readable_values["travel_allowance_readable"]) + 1].replace(',', '')
            if table_readable_values["gratuity_readable"] in row:
                tax_details["gratuity"] = row[row.index(table_readable_values["gratuity_readable"]) + 1].replace(',', '')
            if table_readable_values["leave_encashment_readable"] in row:
                tax_details["leave_encashment"] = row[row.index(table_readable_values["leave_encashment_readable"]) + 1].replace(',', '')
            if table_readable_values["professional_tax_readable"] in row:
                tax_details["professional_tax"] = row[row.index(table_readable_values["professional_tax_readable"]) + 1].replace(',', '')
            if table_readable_values["other_income_readable"] in row:
                tax_details["other_income"] = row[row.index(table_readable_values["other_income_readable"]) + 2].replace(',', '')
            if table_readable_values["section_80C_readable"] in row:
                tax_details["section_80C"] = row[row.index(table_readable_values["section_80C_readable"]) + 2].replace(',', '')
            if table_readable_values["section_80CCC_readable"] in row:
                tax_details["section_80CCC"] = row[row.index(table_readable_values["section_80CCC_readable"]) + 2].replace(',', '')
            if table_readable_values["section_80D_readable"] in row:
                tax_details["section_80D"] = row[row.index(table_readable_values["section_80D_readable"]) + 8].replace(',', '')
            if table_readable_values["section_80E_readable"] in row:
                tax_details["section_80E"] = row[row.index(table_readable_values["section_80E_readable"]) + 8].replace(',', '')
            if table_readable_values["section_80G_readable"] in row:
                tax_details["section_80G"] = row[row.index(table_readable_values["section_80G_readable"]) + 9].replace(',', '')
            if table_readable_values["section_80TTA_readable"] in row:
                tax_details["section_80TTA"] = row[row.index(table_readable_values["section_80TTA_readable"]) + 9].replace(',', '')
            if table_readable_values["rebate_87A_readable"] in row:
                tax_details["rebate_87A"] = row[row.index(table_readable_values["rebate_87A_readable"]) + 5].replace(',', '')
            if table_readable_values["additional_cess_info_readable"] in row:
                tax_details["additional_cess_info"] = row[row.index(table_readable_values["additional_cess_info_readable"]) + 5].replace(',', '')

    return tax_details


### ------------------ PDF Upload & Extraction API ------------------ ###

@app.route("/upload", methods=["POST"])
def upload_pdf():
    user_id = request.form.get("userId")
    # print(user_id)

    user = user_collection.find_one({"_id": ObjectId(user_id)})
    # print(user)

    if user["tax_details_id"] is not None:
        return jsonify({"message": "Tax details already uploaded"}), 400
    
    if "file" not in request.files:
        return jsonify({"message": "No file uploaded"}), 400

    file = request.files["file"]
    
    if file.filename == "":
        return jsonify({"message": "No selected file"}), 400

    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    file.save(file_path)

    # Extract Data
    pdf_text, pdf_tables = extract_form16_data(file_path)
    tax_details = extract_tax_details(pdf_text, pdf_tables)

    # Save to MongoDB
    tax_collection.insert_one(tax_details)
    tax_details["_id"] = str(tax_details["_id"])  # Ensure _id is a string

    # Update User Collection
    user_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"tax_details_id": tax_details["_id"]}}
    )


    return jsonify({"message": "PDF processed successfully", "tax_details": tax_details})


### ------------------ Retrieve All Tax Data ------------------ ###

@app.route("/tax-details", methods=["GET"])
def get_tax_details():
    tax_data = list(tax_collection.find({}, {"_id": 0}))
    
    if not tax_data:
        return jsonify({"message": "No tax details found"}), 404

    return jsonify(tax_data)


if __name__ == "__main__":
    app.run(debug=True)