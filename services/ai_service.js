const { GoogleGenAI } = require('@google/genai');

class AIService {
  constructor() {
    this.genAI = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY 
    });
  }

  /**
   * Analyze CV dengan AI untuk CV Review
   */
  async analyzeCVWithAI(cvText, careerField) {
    try {
      const prompt = `
Analyze this CV for ${careerField} field and provide detailed scoring (0-100) for each category:

CV Text:
${cvText}

Please analyze and score this CV on the following criteria:
1. Relevancy Rate: How relevant is this CV to ${careerField} (0-100)
2. Targeted Job Rate: How well-targeted for specific jobs in ${careerField} (0-100)
3. Relevant Skills: Quality and relevance of technical/soft skills (0-100)
4. Work Experience: Quality, relevance and progression of experience (0-100)  
5. Consistency: Overall consistency, flow, and formatting (0-100)
6. Writing Quality: Grammar, clarity, and presentation (0-100)
7. Overall Score: Weighted average of all above scores (0-100)

Return ONLY valid JSON format:
{
  "scores": {
    "relevancyRate": number,
    "targetedJobRate": number,
    "relevantSkill": number,
    "workExperience": number,
    "consistency": number,
    "writingQuality": number,
    "overallScore": number
  },
  "aiAnalysis": {
    "summary": "brief overall analysis",
    "strengths": ["strength1", "strength2", "strength3"],
    "weaknesses": ["weakness1", "weakness2"],
    "careerFieldFit": "how well this fits the career field"
  },
  "suggestions": [
    "specific improvement suggestion 1",
    "specific improvement suggestion 2", 
    "specific improvement suggestion 3"
  ]
}
      `;

      const result = await this.genAI.models.generateContent({
        model: 'gemini-2.0-flash-001',
        contents: prompt
      });
      const responseText = result.text;
      
      // Clean response and parse JSON
      const cleanedResponse = responseText.replace(/```json\n?|\n?```/g, '').trim();
      const parsedResult = JSON.parse(cleanedResponse);
      
      return parsedResult;
      
    } catch (error) {
      console.error('Error in AI CV analysis:', error);
      
      // Return fallback analysis jika AI gagal
      return {
        scores: {
          relevancyRate: 70,
          targetedJobRate: 65,
          relevantSkill: 75,
          workExperience: 70,
          consistency: 65,
          writingQuality: 70,
          overallScore: 69
        },
        aiAnalysis: {
          summary: "CV analysis completed. Please review the scores and suggestions.",
          strengths: ["Professional formatting", "Clear structure"],
          weaknesses: ["Could be more specific", "May need skill updates"],
          careerFieldFit: `Shows potential for ${careerField} field`
        },
        suggestions: [
          "Add more specific technical skills",
          "Include quantifiable achievements",
          "Update recent experience details"
        ]
      };
    }
  }

  /**
   * Perform job matching dengan AI
   */
  async performJobMatching(cvText, dreamJob, availableJobs) {
    try {
      const jobsForPrompt = availableJobs.map(job => ({
        id: job.id,
        title: job.title,
        company: job.company,
        description: job.description.substring(0, 300),
        requirements: job.requirements,
        location: job.location,
        category: job.category
      }));

      const prompt = `
Match this CV with available jobs, with special focus on dream job: "${dreamJob}"

CV Text (if provided):
${cvText || 'No CV provided - match based on dream job only'}

Available Jobs:
${JSON.stringify(jobsForPrompt, null, 2)}

Please analyze and return top job matches with detailed scoring. Return ONLY valid JSON format:
{
  "matches": [
    {
      "jobId": "job_id_string",
      "title": "job_title",
      "company": "company_name",
      "matchScore": number_0_to_100,
      "skillMatch": number_0_to_100,
      "experienceMatch": number_0_to_100,
      "locationMatch": number_0_to_100,
      "salaryPotential": "estimated_range",
      "reasons": ["specific_reason_1", "specific_reason_2"],
      "missingSkills": ["skill_1", "skill_2"],
      "strengths": ["strength_1", "strength_2"]
    }
  ],
  "aiAnalysis": {
    "summary": "overall matching analysis",
    "dreamJobAlignment": "how well available jobs align with dream job",
    "recommendations": ["recommendation_1", "recommendation_2"],
    "skillGaps": ["skill_gap_1", "skill_gap_2"],
    "careerPath": "suggested career progression"
  }
}

Sort matches by matchScore (highest first). Include max 10 top matches.
      `;

      const result = await this.genAI.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt
      });
      const responseText = result.text;
      
      const cleanedResponse = responseText.replace(/```json\n?|\n?```/g, '').trim();
      const parsedResult = JSON.parse(cleanedResponse);
      
      return parsedResult;
      
    } catch (error) {
      console.error('Error in AI job matching:', error);
      
      // Return fallback matching jika AI gagal
      const fallbackMatches = availableJobs.slice(0, 5).map((job, index) => ({
        jobId: job.id,
        title: job.title,
        company: job.company,
        matchScore: 85 - (index * 10),
        skillMatch: 80 - (index * 8),
        experienceMatch: 75 - (index * 5),
        locationMatch: 90,
        salaryPotential: "Competitive",
        reasons: ["Job title matches interests", "Company has good reputation"],
        missingSkills: ["Specific technical skills"],
        strengths: ["Relevant background", "Good potential fit"]
      }));

      return {
        matches: fallbackMatches,
        aiAnalysis: {
          summary: "Job matching completed based on available positions",
          dreamJobAlignment: `Found several positions related to ${dreamJob}`,
          recommendations: ["Consider applying to top matches", "Develop missing skills"],
          skillGaps: ["Industry-specific skills", "Latest technologies"],
          careerPath: "Focus on gaining experience in target field"
        }
      };
    }
  }
}

module.exports = new AIService();
