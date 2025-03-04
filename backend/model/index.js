const express = require("express");
const app = express();
const cors = require("cors");
// const { ReadableStream } = require("web-streams-polyfill/ponyfill");

app.use(express.json());
app.use(cors());

// Mock function to simulate AI response (replace with actual AI integration)
async function generateTaxResponse(prompt) {
  // Simulate AI processing (replace with actual logic or API call)
  const taxData = {
    "2023-24": {
      ways_available: ["Section 80C (PPF: ₹1,50,000)", "Section 80D (Health Insurance: ₹25,000)"],
      total_tax_saved: 52500, // Example: 1.5L * 30% + 25K * 30%
    },
    "2024-25": {
      ways_available: ["Section 80C (ELSS: ₹1,50,000)", "Section 80CCD(2) (NPS: ₹50,000)"],
      total_tax_saved: 67500, // Example: 1.5L * 30% + 50K * 30%
    },
  };
  return JSON.stringify(taxData);
}

app.post("/generate", async (req, res) => {
  const { prompt } = req.body;

  try {
    const response = await generateTaxResponse(prompt);
    const encoder = new TextEncoder();

    // Stream the response
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(response));
        controller.close();
      },
    });

    res.setHeader("Content-Type", "application/json");
    res.status(200).body = stream;
    res.send(stream);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(8000, () => console.log("Server running on port 8000"));
