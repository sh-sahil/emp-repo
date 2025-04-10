from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import requests
from fastapi.middleware.cors import CORSMiddleware
import pymongo
import os
from dotenv import load_dotenv
from datetime import datetime
from bson import ObjectId
from fastapi.encoders import jsonable_encoder
import re
import json

# Load environment variables
load_dotenv()

app = FastAPI()

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB Connection
client = pymongo.MongoClient(os.getenv("MONGO_URI"))
db = client["ipd"]
user_collection = db["users"]
response_collection = db["response_details"]

# Kaggle API endpoint
KAGGLE_API_URL = "https://8959-35-247-88-209.ngrok-free.app/generate"  # Update if changed

class InputData(BaseModel):
    prompt: str

class SaveResponseData(BaseModel):
    response: str
    userId: str

async def call_kaggle_model(prompt: str):
    """Call the Kaggle notebook's model endpoint."""
    try:
        response = requests.post(KAGGLE_API_URL, json={"prompt": prompt})
        response.raise_for_status()
        return response.json()["response"]
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Failed to call Kaggle API: {str(e)}")

@app.post("/generate")
async def generate_text(data: InputData):
    """Generate text by calling the Kaggle API and return it to the frontend."""
    generated_response = await call_kaggle_model(data.prompt)
    return {"response": generated_response}

@app.post("/save-response")
async def save_response(data: SaveResponseData):
    """Save the generated response to MongoDB (accepts JSON and extracts JSON with regex)."""
    try:


        # Define a regex pattern to match JSON content
        json_pattern =  r'\{.*\}'  # Matches a JSON object
        match = re.search(json_pattern, data.response, re.DOTALL)

        if match:
            json_string = match.group(0)  # Extract the matched JSON string
            print("Extracted JSON string:", json_string)  # Debugging
            try:
                # Validate that it’s valid JSON
                json.loads(json_string)
            except json.JSONDecodeError as e:
                raise HTTPException(status_code=400, detail=f"Extracted response is not valid JSON: {str(e)}")
        else:
            raise HTTPException(status_code=400, detail="No valid JSON found in the response")

        user_id = data.userId

        existing_response = response_collection.find_one({"userId": user_id})

        # Save the extracted JSON string
        tax_comparison = {
            "response": json_string,  # Store the extracted JSON string
            "generatedAt": datetime.utcnow(),
            "userId": user_id
        }

        if existing_response:
            response_collection.update_one(
                {"userId": user_id},
                {"$set": tax_comparison}
            )
            tax_comparison["_id"] = str(existing_response["_id"])
        else:
            result = response_collection.insert_one(tax_comparison)
            tax_comparison["_id"] = str(result.inserted_id)

            user_collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"taxComparison_id": str(result.inserted_id)}}
            )

        return {
            "message": "Response saved successfully",
            "tax_comparison": jsonable_encoder(tax_comparison)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save response: {str(e)}")

# Run the app
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)