from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
from fastapi.middleware.cors import CORSMiddleware
import pymongo
import os
from dotenv import load_dotenv
from datetime import datetime
from bson import ObjectId  # Ensure this is used correctly
from fastapi.encoders import jsonable_encoder

# Load environment variables
load_dotenv()

app = FastAPI()

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB Connection
client = pymongo.MongoClient(os.getenv("MONGO_URI"))
db = client["ipd"]  # Database name
user_collection = db["users"]
response_collection = db["response_details"]  # Collection name

# Load model and tokenizer
model_name = "sh-sahil/fin"
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = AutoModelForCausalLM.from_pretrained(model_name).to(device)
tokenizer = AutoTokenizer.from_pretrained(model_name)

class InputData(BaseModel):
    prompt: str

class SaveResponseData(BaseModel):
    response: str
    userId: str  # Assuming userId is sent from the frontend

async def generate_tax_comparison(prompt: str):
    """Generate a raw text response with tax-saving options based on model output."""
    inputs = tokenizer(prompt, return_tensors="pt").to(device)
    output = model.generate(**inputs, max_new_tokens=500, temperature=0.8, do_sample=True)
    generated_text = tokenizer.decode(output[0], skip_special_tokens=True)

    # Remove the prompt from the generated text if it appears at the start
    if generated_text.startswith(prompt):
        response_text = generated_text[len(prompt):].strip()
    else:
        response_text = generated_text.strip()

    return response_text

@app.post("/generate")
async def generate_text(data: InputData):
    response = await generate_tax_comparison(data.prompt)
    return {"response": response}  # Wrap in a simple dict to maintain structure

@app.post("/save-response")
async def save_response(data: SaveResponseData):
    """Save the generated response to MongoDB (ensure only one response per user)."""
    try:
        user_id = data.userId  # Get user ID from request data

        # Check if the user already has a response
        existing_response = response_collection.find_one({"userId": user_id})

        tax_comparison = {
            "response": data.response,
            "generatedAt": datetime.utcnow(),
            "userId": user_id
        }

        if existing_response:
            # If response exists, update it
            response_collection.update_one(
                {"userId": user_id},
                {"$set": tax_comparison}
            )
            tax_comparison["_id"] = str(existing_response["_id"])
        else:
            # If no response exists, insert a new one
            result = response_collection.insert_one(tax_comparison)
            tax_comparison["_id"] = str(result.inserted_id)

            # Also update user collection with taxComparison_id
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
