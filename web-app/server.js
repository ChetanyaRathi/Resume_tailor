const express = require('express');
const path = require('path');
const puppeteer = require('puppeteer');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname)));
app.use(express.json({ limit: '10mb' }));

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("WARNING: GEMINI_API_KEY is not defined in the root .env file.");
}

// ===========================
//   GEMINI SYSTEM PROMPT
// ===========================
const systemInstruction = `You are an expert ATS resume optimizer. Given a resume and a job description, tailor ONLY the bullet points to better match the job description following these ABSOLUTE RULES:
NEVER append any phrase at the end of a bullet that wasn't in the original resume
NEVER add trailing phrases like 'for Generative AI applications', 'for LLM-based applications', 'for cloud-native development', or any similar suffix
Only insert keywords naturally WITHIN the existing sentence structure, never append anything to the end
If you cannot naturally insert a keyword without appending, skip that keyword entirely
NEVER change any metrics, numbers, tech stack names, action verbs, or remove/add bullet points
Keep bullet count identical to the original — same number of bullets per section

Return ONLY a valid JSON object with these exact keys — no markdown, no explanation, just the JSON:
{
  "main10_bullets": ["bullet1", "bullet2", "bullet3", "bullet4", "bullet5"],
  "wellness_bullets": ["bullet1", "bullet2", "bullet3", "bullet4", "bullet5"],
  "project1_bullets": ["bullet1", "bullet2"],
  "project2_bullets": ["bullet1", "bullet2"],
  "project3_bullets": ["bullet1", "bullet2"],
  "project4_bullets": ["bullet1", "bullet2", "bullet3"]
}`;

// ===========================
//   ROUTES
// ===========================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// POST /api/tailor
app.post('/api/tailor', async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body;
    if (!resumeText || !jobDescription) {
      return res.status(400).json({ error: 'Missing resumeText or jobDescription' });
    }
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' });
    }

    const prompt = `ORIGINAL RESUME:\n${resumeText}\n\nJOB DESCRIPTION:\n${jobDescription}\n\nReturn ONLY a valid JSON object with these exact keys. No markdown, no explanation, just the JSON.`;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;

    const apiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: { temperature: 0.4, responseMimeType: 'application/json' }
      })
    });

    if (!apiResponse.ok) {
      const errData = await apiResponse.json().catch(() => ({}));
      throw new Error(errData.error?.message || `API request failed with status ${apiResponse.status}`);
    }

    const data = await apiResponse.json();
    if (!data.candidates?.length) throw new Error('No valid response received from Gemini.');

    let raw = data.candidates[0].content.parts[0].text;
    // Strip any accidental markdown fences
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();

    let bullets;
    try {
      bullets = JSON.parse(raw);
    } catch (e) {
      throw new Error('Gemini did not return valid JSON: ' + raw.slice(0, 200));
    }

    // Build a plain-text preview for the right panel
    const allBullets = [
      ...(bullets.main10_bullets || []),
      ...(bullets.wellness_bullets || []),
      ...(bullets.project1_bullets || []),
      ...(bullets.project2_bullets || []),
      ...(bullets.project3_bullets || []),
      ...(bullets.project4_bullets || [])
    ];
    const tailoredResume = allBullets.map(b => '• ' + b).join('\n');

    res.json({ tailoredResume, bullets });
  } catch (error) {
    console.error("Error tailoring resume:", error);
    res.status(500).json({ error: error.message || 'An error occurred while communicating with Gemini API' });
  }
});

// POST /api/generate-pdf — Inject bullets into hardcoded HTML template
app.post('/api/generate-pdf', async (req, res) => {
  try {
    const b = req.body; // { main10_bullets, wellness_bullets, project1_bullets, ... }

    const li = (arr) => (arr || []).map(x => `<li>${x.replace(/ ,/g,',').replace(/ \./g,'.')}</li>`).join('');

    const fullHTML = `<!DOCTYPE html>
<html><head><meta charset='UTF-8'>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Times New Roman',serif; font-size:9pt; color:#000; background:white; padding:0.28in 0.4in; line-height:1.15; width:8.5in; }
.name { font-size:14pt; font-weight:bold; text-align:center; letter-spacing:6px; text-transform:uppercase; margin-bottom:1px; }
.contact { text-align:center; font-size:8.5pt; margin-bottom:4px; }
.sec { font-size:9pt; font-weight:bold; text-transform:uppercase; border-bottom:0.8px solid #000; margin-top:5px; margin-bottom:2px; padding-bottom:0.5px; letter-spacing:0.3px; }
.row { display:flex; justify-content:space-between; font-size:9pt; font-weight:bold; margin-top:2px; }
.row.sub { font-weight:normal; font-style:italic; font-size:8.8pt; margin-top:0; margin-bottom:1px; }
.row span:last-child { white-space:nowrap; flex-shrink:0; margin-left:6px; }
.sk { font-size:8.8pt; line-height:1.15; margin-bottom:1px; }
ul { margin-left:13px; margin-top:1px; }
li { font-size:8.7pt; line-height:1.18; margin-bottom:0.5px; text-align:justify; }
</style>
</head><body>

<div class='name'>Chetanya Anil Rathi</div>
<div class='contact'>+1(315) 278-3090 | crathi@syr.edu | https://github.com/ChetanyaRathi | https://www.linkedin.com/in/chetanya-rathi1711/ | Portfolio</div>

<div class='sec'>Education</div>
<div class='row'><span>Syracuse University</span><span>Syracuse, NY, USA</span></div>
<div class='row sub'><span>Master of Science in Computer Science; GPA: 3.55/4</span><span>May 2026</span></div>
<ul><li>Coursework: Machine Learning, Operating Systems, Algorithms, Natural Language Processing, Databases, IoT, Architecture, Agentic AI</li></ul>
<div class='row'><span>Savitribai Phule Pune University</span><span>Pune, India</span></div>
<div class='row sub'><span>Bachelor of Technology in Artificial Intelligence and Data Science; GPA: 3.7/4</span><span>May 2024</span></div>
<ul><li>Coursework: Cloud Computing, Web Technology, Computer Networks, Deep Learning</li></ul>

<div class='sec'>Technical Skills</div>
<div class='sk'><b>Programming:</b> JavaScript (ES6+), TypeScript, Python, C++, Java, HTML5, CSS3, PHP, Git, Bash, Linux, Data Structures, Algorithms, OOP</div>
<div class='sk'><b>Software Engineering:</b> System Design, Backend Architecture, API Design, Scalability, Performance Optimization</div>
<div class='sk'><b>GenAI Tools:</b> LangChain, LangGraph, Multi-RAG, Gemini, Vertex AI, BERT, Embedding Models, LLM Fine-Tuning, Context Retrieval, Vector Search</div>
<div class='sk'><b>Backend &amp; DB:</b> Node.js, Flask, FastAPI, REST APIs, Microservices, SQL, MongoDB, PostgreSQL, ChromaDB, JWT</div>
<div class='sk'><b>DevOps &amp; Cloud:</b> AWS Lambda, AWS S3, AWS RDS, EC2, CI/CD Pipelines, Docker, n8n, Cloud Monitoring, Model Deployment</div>

<div class='sec'>Professional Experience</div>
<div class='row'><span>Main 10 – Maintenance Management Tool</span><span>Pune, India</span></div>
<div class='row sub'><span>Software Engineering Intern - AI and Automation</span><span>January 2024 – August 2024</span></div>
<ul>${li(b.main10_bullets)}</ul>
<div class='row'><span>Hum Aspen Wellness Private Limited</span><span>Pune, India</span></div>
<div class='row sub'><span>Full Stack Generative AI Engineer Intern</span><span>January 2023 – December 2023</span></div>
<ul>${li(b.wellness_bullets)}</ul>

<div class='sec'>Projects</div>
<div class='row'><span>Real-Time Computer Activity and Monitoring System | React.js, FastAPI, AWS, Chart.js</span><span>November 2025</span></div>
<ul>${li(b.project1_bullets)}</ul>
<div class='row'><span>Multi Agentic RAG System Using Pre-Act and Corrective Agents | Pre-Act, n8n, LangChain, Gemini, OpenAI</span><span>September 2025</span></div>
<ul>${li(b.project2_bullets)}</ul>
<div class='row'><span>EECS Hackathon, Syracuse University | Flask, Python, AI, ML (Link)</span><span>March 2025</span></div>
<ul>${li(b.project3_bullets)}</ul>
<div class='row'><span>Voice Cloning and Forgery Detection Using WaveGAN and SpecGAN | GenAI, WaveGAN, SpecGAN, Java, MongoDB</span><span>September 2023</span></div>
<ul>${li(b.project4_bullets)}</ul>

</body></html>`;

    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(fullHTML, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      width: '8.5in',
      height: '11in',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      preferCSSPageSize: true
    });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Tailored_Resume.pdf');
    res.send(pdf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n================================`);
  console.log(`Resume Tailor Web App Server`);
  console.log(`Listening on http://localhost:${PORT}`);
  console.log(`================================\n`);
});
