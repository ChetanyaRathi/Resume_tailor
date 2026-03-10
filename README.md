# Resume Tailor 🎯

An AI-powered resume tailoring tool that customizes your resume to match any job description using Google Gemini 2.5 Pro.

## Features
- Upload PDF or .docx resume
- Paste any job description
- AI tailors your resume to match the job while keeping the same word count, projects, and structure
- Powered by Gemini 2.5 Pro
- CLI version and Web App version

## Project Structure
Resume-Tailor/
├── cli-test.js          # CLI version
├── utils/
│   ├── geminiClient.js  # Chrome extension Gemini client
│   ├── pdfParser.js     # PDF parser
│   ├── docxParser.js    # DOCX parser
│   └── pdfGenerator.js  # PDF generator
├── web-app/
│   ├── server.js        # Express server
│   └── index.html       # Web UI
├── manifest.json        # Chrome extension manifest
├── popup.html           # Chrome extension popup
└── popup.js             # Chrome extension logic

## Setup

### Prerequisites
- Node.js 18+
- Google Gemini API key (free at https://aistudio.google.com/app/apikey)

### Installation

1. Clone the repo:
```bash
git clone https://github.com/ChetanyaRathi/Resume_tailor.git
cd Resume_tailor
```

2. Install dependencies:
```bash
npm install
cd web-app && npm install
```

3. Create a .env file in the root folder:
```
GEMINI_API_KEY=your_gemini_api_key_here
```

## Usage

### CLI Version
```bash
node cli-test.js YourResume.pdf
```
Paste the job description when prompted. The tailored resume will be saved as tailored-resume.txt.

### Web App Version
```bash
cd web-app
node server.js
```
Open http://localhost:3000 in Chrome.

### Chrome Extension

1. Go to chrome://extensions
2. Enable Developer Mode
3. Click Load Unpacked and select the Resume-Tailor folder

## How It Works

1. Parses your resume PDF/DOCX to extract text
2. Sends resume + job description to Gemini 2.5 Pro
3. Gemini identifies top ATS keywords from the job description
4. Keywords are naturally inserted into existing bullet points
5. Output preserves original word count, structure, metrics and action verbs

## Tech Stack

- Node.js + Express
- Google Gemini 2.5 Pro API
- PDF.js + Mammoth.js for file parsing
- Puppeteer for PDF generation
- Chrome Extension (Manifest V3)

## License
MIT
