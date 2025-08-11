const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const OpenAI = require('openai');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(express.json());

// Email formalization endpoint
app.post('/api/formalize', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email content is required' });
    }

    const prompt = `Transform this casual email into professional, business-appropriate language while maintaining the original meaning and intent:

Original: ${email}

Please provide only the formalized version without any explanations or additional text.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a professional email writing assistant. Transform casual emails into formal, business-appropriate language while preserving the original meaning and intent."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const formalizedEmail = completion.choices[0].message.content.trim();

    res.json({ formalizedEmail });
  } catch (error) {
    console.error('Error formalizing email:', error);
    res.status(500).json({ error: 'Failed to formalize email' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
