document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const saveKeyBtn = document.getElementById('saveKeyBtn');
  const keyStatus = document.getElementById('keyStatus');
  
  const resumeFileInput = document.getElementById('resumeFile');
  const fileNameDisplay = document.getElementById('fileNameDisplay');
  
  const jobDescInput = document.getElementById('jobDesc');
  const generateBtn = document.getElementById('generateBtn');
  
  const statusSection = document.getElementById('statusSection');
  const statusText = document.getElementById('statusText');
  const statusBadge = document.getElementById('statusBadge');

  // Load saved API key from chrome.storage or env.js
  chrome.storage.local.get(['geminiApiKey'], (result) => {
    if (result.geminiApiKey) {
      apiKeyInput.value = result.geminiApiKey;
    } else if (typeof ENV !== 'undefined' && ENV.GEMINI_API_KEY) {
      apiKeyInput.value = ENV.GEMINI_API_KEY;
    }
  });

  // Save API key
  saveKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
      chrome.storage.local.set({ geminiApiKey: key }, () => {
        keyStatus.textContent = 'API Key saved successfully!';
        keyStatus.className = 'status-msg status-success';
        setTimeout(() => { keyStatus.textContent = ''; keyStatus.className = 'status-msg'; }, 3000);
      });
    } else {
      keyStatus.textContent = 'Please enter a valid key.';
      keyStatus.className = 'status-msg status-error';
    }
  });

  // Handle file selection display
  resumeFileInput.addEventListener('change', () => {
    const file = resumeFileInput.files[0];
    const wrapper = fileNameDisplay.closest('.file-upload-wrapper');
    if (file) {
      fileNameDisplay.textContent = file.name;
      wrapper.style.borderColor = 'var(--primary-color)';
      wrapper.style.backgroundColor = 'rgba(59, 130, 246, 0.05)';
    } else {
      fileNameDisplay.textContent = 'Choose .pdf or .docx file';
      wrapper.style.borderColor = 'var(--border-color)';
      wrapper.style.backgroundColor = 'var(--bg-color)';
    }
  });

  function setStatus(message, isError = false) {
    statusSection.classList.remove('hidden');
    statusText.textContent = message;
    statusText.style.color = isError ? 'var(--error-color)' : 'var(--text-primary)';
    
    if (isError || message === 'Done!') {
      // Show icon depending on success or error
      if (isError) {
        statusBadge.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--error-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
      } else {
        statusBadge.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
      }
    } else {
      // Show spinner
      statusBadge.innerHTML = '<div class="spinner"></div>';
    }
  }

  // Generate Button Click
  generateBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    const file = resumeFileInput.files[0];
    const jobDescription = jobDescInput.value.trim();

    // Basic Validation
    if (!apiKey) {
      setStatus('Please save your API key first.', true);
      return;
    }
    if (!file) {
      setStatus('Please upload a resume file.', true);
      return;
    }
    if (!jobDescription) {
      setStatus('Please paste a job description.', true);
      return;
    }

    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx') {
      setStatus('Unsupported file format. Please upload PDF or DOCX.', true);
      return;
    }

    try {
      generateBtn.disabled = true;
      generateBtn.style.opacity = '0.7';
      
      // Step 1: Parse Document
      setStatus(`Parsing ${ext.toUpperCase()} document...`);
      let resumeText = '';
      if (ext === 'pdf') {
        resumeText = await parsePdf(file);
      } else if (ext === 'docx') {
        resumeText = await parseDocx(file);
      }

      if (!resumeText || resumeText.trim() === '') {
        throw new Error('Could not extract valid text from the file.');
      }

      // Step 2: Call Gemini API
      setStatus('Tailoring resume with Gemini AI...');
      const tailoredText = await tailorResume(apiKey, resumeText, jobDescription);

      if (!tailoredText || tailoredText.trim() === '') {
        throw new Error('Gemini returned an empty response.');
      }

      // Step 3: Generate and Download PDF
      setStatus('Generating tailored PDF...');
      generatePdf(tailoredText);

      setStatus('Done!');
    } catch (error) {
      console.error(error);
      setStatus(error.message || 'An error occurred during processing.', true);
    } finally {
      generateBtn.disabled = false;
      generateBtn.style.opacity = '1';
    }
  });
});
