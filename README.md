# Email Formalizer

A modern web application that uses AI to transform casual emails into professional, formal communication.

## Features

- 🤖 **AI-Powered**: Uses OpenAI's GPT-3.5-turbo to intelligently formalize emails
- 🎨 **Modern UI**: Beautiful, responsive design built with React and Tailwind CSS
- 📋 **Easy Copy**: One-click copy to clipboard functionality
- 🔄 **Fallback Mode**: Simple text transformation when AI API is unavailable
- ⚡ **Fast**: Built with Vite for lightning-fast development and builds

## Tech Stack

### Frontend
- React 18
- Vite
- Tailwind CSS
- Lucide React (icons)
- Axios (HTTP client)

### Backend
- Node.js
- Express.js
- OpenAI API
- CORS enabled

## Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- OpenAI API key

### Installation

1. **Clone and navigate to the project**
   ```bash
   cd email-formalizer
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd server
   npm install
   ```

4. **Set up environment variables**
   ```bash
   cd server
   cp env.example .env
   ```
   
   Edit `.env` and add your OpenAI API key:
   ```
   PORT=3001
   ```

### Running the Application

1. **Start the backend server**
   ```bash
   cd server
   npm start
   ```
   The server will run on http://localhost:3001

2. **Start the frontend development server** (in a new terminal)
   ```bash
   npm run dev
   ```
   The app will run on http://localhost:5173

3. **Open your browser** and navigate to http://localhost:5173

## Usage

1. **Paste your casual email** into the left textarea
2. **Click "Make Formal"** to transform it using AI
3. **Copy the formalized version** with one click
4. **Use the professional email** in your communications

## API Endpoints

### POST /api/formalize
Formalizes an email using AI.

**Request:**
```json
{
  "email": "hi there, can u pls send me the report asap? thx!"
}
```

**Response:**
```json
{
  "original": "hi there, can u pls send me the report asap? thx!",
  "formalized": "Dear [Recipient],\n\nI hope this message finds you well. Would you please send me the report as soon as possible?\n\nThank you for your assistance.\n\nBest regards,\n[Your name]"
}
```

### GET /api/health
Health check endpoint.

**Response:**
```json
{
  "status": "OK",
  "message": "Email Formalizer API is running"
}
```

## Development

### Frontend Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Backend Development
```bash
cd server
npm run dev          # Start with nodemon (auto-restart)
npm start           # Start production server
```

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `OPENAI_API_KEY` | Your OpenAI API key | Yes | - |
| `PORT` | Server port | No | 3001 |

## Getting an OpenAI API Key

1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to [API Keys](https://platform.openai.com/api-keys)
4. Create a new API key
5. Copy the key and add it to your `.env` file

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

If you encounter any issues or have questions, please open an issue on GitHub.
