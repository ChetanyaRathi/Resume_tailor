/**
 * Calls the Gemini API to tailor the resume based on the job description.
 * @param {string} apiKey - The user's Gemini API key.
 * @param {string} resumeText - The parsed text of the original resume.
 * @param {string} jobDescription - The target job description text.
 * @returns {Promise<string>} The tailored resume text.
 */
async function tailorResume(apiKey, resumeText, jobDescription) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const systemInstruction = `You are an expert ATS resume optimizer and professional resume writer. Your job is to tailor a resume to match a job description while following EXTREMELY strict rules.

ABSOLUTE RULES — NEVER BREAK THESE:
1. NEVER change, remove, or reorder any technical stack names (e.g. MERN Stack, FastAPI, LangChain, ChromaDB, Docker)
2. NEVER change any numbers or metrics (e.g. 55%, 85%, 15k+, 600+, 30%)
3. NEVER change coursework listed under education
4. NEVER change the order of skills, tools, or technologies in the Technical Skills section
5. NEVER add new skills, tools, or technologies that are not already in the original resume
6. NEVER remove any existing skills, tools, or technologies
7. NEVER change company names, job titles, university names, dates, or locations
8. NEVER change project names or their tech stacks listed beside them
9. NEVER add new bullet points or remove existing bullet points
10. NEVER change the total word count by more than 10 words
11. NEVER change specific physiological or domain-specific terms (e.g. heart rate variability, sleep patterns)
12. NEVER swap action verbs (e.g. if original says "Built", keep "Built", do not replace with "Developed")

WHAT YOU ARE ALLOWED TO DO:
1. Naturally insert job-relevant keywords into existing bullet points without replacing original terms
2. Slightly rephrase a sentence ending to better match the job description tone
3. Add a job-relevant adjective or descriptor where it fits naturally
4. Reorder words within a bullet point only if it improves ATS keyword matching
5. Replace a generic word with a more job-specific synonym ONLY if the meaning is identical

PROCESS:
1. First, extract the top 10 ATS keywords from the job description
2. Identify which bullets in the resume are most relevant to those keywords
3. Naturally weave in missing keywords into those bullets without breaking any absolute rules
4. Do a final check — compare original vs tailored word by word to ensure no absolute rules were broken
5. Return the complete tailored resume in plain text preserving the exact original formatting

QUALITY CHECK BEFORE RETURNING:
- Word count difference must be within ±10 words
- Number of bullet points must be identical
- All metrics and numbers must be identical
- All tech stack names must be identical
- All action verbs at the start of bullets must be identical`;

  const prompt = `ORIGINAL RESUME:\n${resumeText}\n\nJOB DESCRIPTION:\n${jobDescription}`;

  const requestBody = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    generationConfig: {
      temperature: 0.7
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("Gemini API Error:", errorData);
    throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
  }

  const data = await response.json();
  if (data.candidates && data.candidates.length > 0) {
    let result = data.candidates[0].content.parts[0].text;
    
    // Clean up markdown formatting and common prefix text
    let cleanedResume = result.replace(/\*\*/g, '').replace(/\*/g, '').replace(/__/g, '').replace(/##/g, '').replace(/`/g, '');
    cleanedResume = cleanedResume.replace(/here'?s your tailored resume:?\n?/gi, '').trim();
    
    // Remove markdown block backticks if the model still outputs it despite instructions
    result = cleanedResume.replace(/^```(?:markdown)?\s*/i, '').replace(/```$/i, '');
    return result.trim();
  } else {
    throw new Error('No valid response received from Gemini.');
  }
}
