/**
 * Parses a .docx File object and extracts its text using mammoth.js.
 * @param {File} file 
 * @returns {Promise<string>}
 */
async function parseDocx(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
    
    // Mammoth might return warnings we can log
    if (result.messages.length > 0) {
      console.warn("Mammoth parsing warnings:", result.messages);
    }
    
    return result.value.trim();
  } catch (error) {
    console.error("Error parsing DOCX:", error);
    throw new Error('Failed to parse DOCX file. Ensure it is a valid Word document.');
  }
}
