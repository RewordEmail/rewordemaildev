const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Email formalization endpoint
app.post('/api/formalize', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email content is required' });
    }

    const prompt = `Please rewrite the following email to make it more formal and professional while maintaining the original meaning and intent. Use business-appropriate language and tone:

Original email:
${email}

Formal version:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a professional email writing assistant. Your task is to convert casual emails into formal, business-appropriate communication while preserving the original meaning and intent."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const formalizedEmail = completion.choices[0].message.content;
    
    res.json({ 
      original: email,
      formalized: formalizedEmail 
    });

  } catch (error) {
    console.error('Error formalizing email:', error);
    res.status(500).json({ 
      error: 'Failed to formalize email',
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Email Formalizer API is running' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/api/health`);
}); 