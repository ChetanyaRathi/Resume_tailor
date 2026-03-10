const fs = require('fs');
const path = require('path');
const readline = require('readline');
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Error: GEMINI_API_KEY is not set. Please create a .env file with GEMINI_API_KEY=your_key");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

const systemInstruction = `You are an ATS keyword optimizer. You will receive a resume and a job description.

YOUR ONLY JOB: Find the top 8 ATS keywords from the job description that are MISSING from the resume. Then insert each missing keyword into the most relevant existing bullet point by replacing one generic word with the keyword — nothing else.

HARD RULES — if you break any of these, your output is invalid:
1. Copy every single line of the resume EXACTLY as written — character by character
2. The ONLY change allowed is replacing one existing generic word or short phrase with a job keyword
3. NEVER add words to the end of a sentence
4. NEVER add words to the beginning of a sentence
5. NEVER add parenthetical phrases using commas
6. NEVER change 'maintenance knowledge retrieval system' — leave it exactly as is
7. NEVER change any action verb at the start of a bullet (Built, Designed, Implemented, Developed, Engineered, Enhanced, Integrated, Deployed, Optimized, Created, Architected, Delivered, Published)
8. NEVER expand any acronym — RAG stays RAG, NLP stays NLP
9. NEVER change any number, percentage, metric, date, company name, university name, project name, tech stack name
10. NEVER add a new phrase that does not replace an existing word
11. If you cannot insert a keyword without breaking the above rules — SKIP that keyword entirely
12. The output must have the EXACT same number of lines as the input

OUTPUT FORMAT: Return the complete resume as plain text only. No markdown, no explanation, no intro sentence.`;

const model = genAI.getGenerativeModel({ 
  model: "gemini-2.5-pro",
  systemInstruction 
});

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Error: Please provide a PDF file path as an argument.");
  console.error("Usage: node cli-test.js <path-to-resume.pdf>");
  process.exit(1);
}

const pdfPath = path.resolve(args[0]);

if (!fs.existsSync(pdfPath)) {
  console.error(`Error: File not found at ${pdfPath}`);
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

const askJobDescription = () => {
  return new Promise((resolve) => {
    console.log("Please paste the job description below. Press Ctrl+D when finished, or type 'EOF' on a new line:");
    let jobDesc = "";
    
    rl.on('line', (line) => {
      if (line.trim().toUpperCase() === 'EOF') {
        rl.close();
      } else {
        jobDesc += line + '\n';
      }
    });

    // Handle end-of-file (Ctrl+D)
    rl.on('close', () => {
      resolve(jobDesc.trim());
    });
  });
};

async function main() {
  try {
    console.log(`Reading PDF: ${pdfPath}...`);
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdfParse(dataBuffer);
    const resumeText = pdfData.text;

    if (!resumeText || resumeText.trim() === '') {
      throw new Error("Could not extract valid text from the PDF.");
    }

    const jobDescription = await askJobDescription();

    if (!jobDescription) {
      throw new Error("Job description cannot be empty.");
    }

    console.log("\nTailoring resume with Gemini AI...");
    
    const prompt = `ORIGINAL RESUME:\n${resumeText}\n\nJOB DESCRIPTION:\n${jobDescription}`;
    
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7
      }
    });

    const response = await result.response;
    let tailoredResume = response.text();
    const cleanedResume = tailoredResume.replace(/\*\*/g, '').replace(/\*/g, '').replace(/__/g, '').replace(/##/g, '').replace(/`/g, '');
    
    // Strip markdown block formatting if the model outputs it
    let tailoredText = cleanedResume.replace(/^```(?:markdown)?\s*/i, '').replace(/```$/i, '').trim();

    console.log("\n================ TAILORED RESUME ================\n");
    console.log(tailoredText);
    console.log("\n=================================================\n");

    const outputPath = path.join(process.cwd(), 'tailored-resume.txt');
    fs.writeFileSync(outputPath, tailoredText, 'utf8');
    console.log(`Saved tailored resume to: ${outputPath}`);

  } catch (error) {
    console.error("\nAn error occurred:", error.message || error);
  } finally {
    process.exit(0);
  }
}

main();
