import streamlit as st
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
import time

# Streamlit page configuration
st.set_page_config(page_title="Chat with Fin Model", layout="wide")

# Initialize session state for chat history and model
if "messages" not in st.session_state:
    st.session_state.messages = []

if "model" not in st.session_state:
    # Load model and tokenizer only once
    model_name = "sh-sahil/fin"
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    try:
        st.session_state.tokenizer = AutoTokenizer.from_pretrained(model_name)
        st.session_state.model = AutoModelForCausalLM.from_pretrained(model_name).to(device)
        st.write(f"Model {model_name} loaded on {device}")
    except Exception as e:
        st.error(f"Failed to load model: {str(e)}")
        st.stop()

# Title and description
st.title("Chat with Fin Model - Tax Advisor")
st.write("Ask about your taxes and get advice on the best tax regime in India!")

# Predefined prompt for the model
TAX_ADVISOR_PROMPT = (
    "You are a Tax Advisor in India. You suggest which tax regime is best for a particular person to save maximum tax. "
    "Based on my financial details: Make sure you respond in 2000 words or less."
)

# Function to generate and stream response
def generate_response(prompt):
    full_prompt = f"{TAX_ADVISOR_PROMPT}\n\nUser input: {prompt}"
    inputs = st.session_state.tokenizer(full_prompt, return_tensors="pt").to(st.session_state.model.device)
    # Generate tokens one-by-one with streaming
    for token_id in st.session_state.model.generate(
        **inputs,
        max_new_tokens=5000,  # Adjust if needed to ensure <2000 words
        temperature=0.8,
        do_sample=True,
        pad_token_id=st.session_state.tokenizer.eos_token_id
    )[0]:
        token = st.session_state.tokenizer.decode(token_id, skip_special_tokens=True)
        yield token
        time.sleep(0.05)  # Adjust delay for desired speed

# Chat input
with st.form(key="chat_form", clear_on_submit=True):
    user_input = st.text_input("Your financial details (e.g., income, deductions):", key="input")
    submit_button = st.form_submit_button(label="Send")

# Handle user input and display chat
if submit_button and user_input:
    # Add user message to chat history
    st.session_state.messages.append({"role": "user", "content": user_input})
    
    # Display user message immediately
    with st.chat_message("user"):
        st.write(user_input)
    
    # Generate and stream assistant response
    with st.chat_message("assistant"):
        # Use st.write_stream for real-time streaming
        streamed_response = st.write_stream(generate_response(user_input))
    
    # Add assistant response to chat history
    st.session_state.messages.append({"role": "assistant", "content": streamed_response.strip()})

# Display chat history
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.write(message["content"])

# Optional: Add a button to clear chat history
if st.button("Clear Chat"):
    st.session_state.messages = []
    st.rerun()

# Instructions
st.sidebar.title("Instructions")
st.sidebar.write("1. Enter your financial details (e.g., income, deductions) in the input box.")
st.sidebar.write("2. Press 'Send' to get tax advice streamed in real-time.")
st.sidebar.write("3. Use 'Clear Chat' to reset the conversation.")