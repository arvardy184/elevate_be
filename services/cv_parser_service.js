const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

class CVParserService {
  /**
   * Extract text from CV file (PDF, DOC, DOCX)
   * @param {string} filePath - Path to the file
   * @returns {string} Extracted text
   */
  static async extractText(filePath) {
    try {
      const fileExtension = path.extname(filePath).toLowerCase();
      let text = '';
      
      if (fileExtension === '.pdf') {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        text = data.text;
      } else if (fileExtension === '.doc' || fileExtension === '.docx') {
        const result = await mammoth.extractRawText({ path: filePath });
        text = result.value;
      } else {
        throw new Error(`Unsupported file type: ${fileExtension}`);
      }

      // Clean and normalize text
      text = text.replace(/\s+/g, ' ').trim();
      
      if (text.length < 10) {
        throw new Error('File appears to be empty or unreadable');
      }
      
      return text;
      
    } catch (error) {
      console.error('Error extracting text from CV:', error);
      throw new Error(`Failed to extract text: ${error.message}`);
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  static async parseCV(filePath, mimeType) {
    try {
      let text = '';
      
      if (mimeType === 'application/pdf') {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        text = data.text;
      } else if (mimeType.includes('word')) {
        const result = await mammoth.extractRawText({ path: filePath });
        text = result.value;
      } else {
        throw new Error('Unsupported file type');
      }

      // Clean and normalize text
      text = text.replace(/\s+/g, ' ').trim();
      
      return {
        success: true,
        text,
        wordCount: text.split(' ').length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = CVParserService;
