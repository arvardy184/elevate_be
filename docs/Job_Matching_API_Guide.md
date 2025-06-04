# 🎯 Job Matching API Guide

## Overview
Job Matching system di Elevate mendukung 2 skenario:
1. **Job matching dengan CV yang sudah di-review** (lebih akurat)
2. **Job matching hanya berdasarkan dream job** (tanpa CV)

## 🔄 Flow Complete Job Matching

### Skenario 1: With CV Review (Recommended)
```
1. Upload CV → /api/cv-review/upload
   ↓
2. Get CV Review ID
   ↓  
3. Job Matching → /api/job-matching/match (with cvReviewId)
   ↓
4. Get Job Details → /api/job-matching/jobs/{id}
```

### Skenario 2: Without CV (Basic)
```
1. Job Matching → /api/job-matching/match (dreamJob only)
   ↓
2. Get Job Details → /api/job-matching/jobs/{id}
```

## 🚀 Endpoints

### 1. Job Matching dengan CV Review yang sudah ada
```
POST /api/job-matching/match
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "dreamJob": "Software Engineer",
  "cvReviewId": "clxx-cv-review-id" // optional
}
```

### 2. Upload CV dan langsung Job Matching ⭐ NEW!
```
POST /api/job-matching/upload-and-match
Authorization: Bearer {token}
Content-Type: multipart/form-data

Form Data:
- cv: [file] (PDF/DOC/DOCX, max 5MB)
- dreamJob: "Software Engineer"
- saveCV: true/false (optional, default: false)
```

**Keunggulan endpoint baru:**
- ✅ Upload CV dan matching dalam 1 request
- ✅ Otomatis extract text dari CV
- ✅ Option untuk save CV sebagai CV Review juga
- ✅ Support semua format CV (PDF, DOC, DOCX)
- ✅ Upload ke cloud storage (B2) jika saveCV=true

**Response untuk upload-and-match:**
```json
{
  "status": "success",
  "message": "CV berhasil diupload dan job matching selesai!",
  "data": {
    "id": "matching_id",
    "dreamJob": "Software Engineer",
    "matches": [
      {
        "jobId": "job_id_1",
        "title": "Senior Software Engineer",
        "company": "Tech Corp",
        "matchScore": 92,
        "skillMatch": 88,
        "experienceMatch": 85,
        "locationMatch": 95,
        "salaryPotential": "$80k-120k",
        "reasons": ["Strong technical background", "Experience matches requirements"],
        "missingSkills": ["Kubernetes", "GraphQL"],
        "strengths": ["React expertise", "Team leadership"]
      }
    ],
    "aiAnalysis": {
      "summary": "Found excellent matches based on your profile",
      "dreamJobAlignment": "Very high alignment with available positions",
      "recommendations": ["Apply to top 3 matches", "Focus on Kubernetes skills"],
      "skillGaps": ["Cloud technologies", "DevOps tools"],
      "careerPath": "Senior to Lead Engineer progression"
    },
    "cvReview": { // Only if saveCV=true
      "fileName": "john_doe_cv.pdf",
      "careerField": "Software Engineering",
      "overallScore": 0, // Will be 0 until CV review analysis is done
      "b2FileUrl": "https://download-url"
    },
    "totalMatches": 5,
    "cvSaved": true, // Indicates if CV was saved for review
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Response untuk original match endpoint:**
```json
{
  "status": "success",
  "message": "Job matching berhasil dilakukan!",
  "data": {
    "id": "matching_id",
    "dreamJob": "Software Engineer",
    "matches": [
      {
        "jobId": "job_id_1",
        "title": "Senior Software Engineer",
        "company": "Tech Corp",
        "matchScore": 92,
        "skillMatch": 88,
        "experienceMatch": 85,
        "locationMatch": 95,
        "salaryPotential": "$80k-120k",
        "reasons": ["Strong technical background", "Experience matches requirements"],
        "missingSkills": ["Kubernetes", "GraphQL"],
        "strengths": ["React expertise", "Team leadership"]
      }
    ],
    "aiAnalysis": {
      "summary": "Found excellent matches based on your profile",
      "dreamJobAlignment": "Very high alignment with available positions",
      "recommendations": ["Apply to top 3 matches", "Focus on Kubernetes skills"],
      "skillGaps": ["Cloud technologies", "DevOps tools"],
      "careerPath": "Senior to Lead Engineer progression"
    },
    "cvReview": {
      "fileName": "john_doe_cv.pdf",
      "careerField": "Software Engineering",
      "overallScore": 87
    },
    "totalMatches": 5,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### 3. Get Job Details
```
GET /api/job-matching/jobs/{id}
```

### 4. Get Job Categories
```
GET /api/job-matching/categories
```

### 5. Get Matching History
```
GET /api/job-matching/history
Authorization: Bearer {token}
```

## 🎯 Use Cases

### Case 1: Fresh Graduate
```json
{
  "dreamJob": "Junior Frontend Developer"
}
```
→ AI akan cari job yang cocok untuk level junior

### Case 2: Career Changer with CV
```json
{
  "dreamJob": "Product Manager",
  "cvReviewId": "clxx-existing-cv-review"
}
```
→ AI akan analisis CV + dream job untuk rekomendasi yang lebih personal

### Case 3: Upload CV Baru untuk Job Matching ⭐ NEW!
```
Form Data:
cv: [CV_FILE.pdf]
dreamJob: "Data Scientist"
saveCV: true
```
→ AI akan extract CV, save untuk review (opsional), dan langsung matching dengan jobs

### Case 4: Quick Job Matching tanpa Save CV
```
Form Data:
cv: [CV_FILE.pdf]
dreamJob: "Full Stack Developer"
saveCV: false
```
→ AI akan extract CV, matching jobs, tapi tidak save CV untuk review

## 🚀 Testing Examples

### Postman Collection

**Test 1: Basic Job Matching**
```
POST {{baseUrl}}/api/job-matching/match
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "dreamJob": "Software Engineer"
}
```

**Test 2: CV-Based Job Matching**  
```
POST {{baseUrl}}/api/job-matching/match
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "dreamJob": "Full Stack Developer",
  "cvReviewId": "clxxx-your-cv-review-id"
}
```

## ⚠️ Common Issues

1. **Error: `req.body undefined`**
   - Pastikan Content-Type: `application/json`
   - Pastikan body berisi JSON valid

2. **Error: `CV Review tidak ditemukan`**
   - cvReviewId salah atau bukan milik user yang login
   - Upload CV dulu atau gunakan tanpa cvReviewId

3. **Error: `Dream job wajib diisi`**
   - Field `dreamJob` kosong atau tidak ada

## 🔧 Troubleshooting

Check request dengan curl:
```bash
curl -X POST http://localhost:3009/api/job-matching/match \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"dreamJob": "Software Engineer"}'
```

## 📊 AI Analysis Explanation

- **matchScore**: Kecocokan overall (0-100)
- **skillMatch**: Kecocokan skill teknis
- **experienceMatch**: Kecocokan pengalaman kerja  
- **locationMatch**: Kecocokan lokasi kerja
- **reasons**: Alasan kenapa job ini cocok
- **missingSkills**: Skill yang perlu dipelajari
- **strengths**: Kelebihan kandidat untuk job ini 

## 🔧 Error Handling

### Upload Errors
```json
{
  "status": "error",
  "message": "Format file tidak didukung. Gunakan PDF, DOC, atau DOCX"
}
```

### File Size Error
```json
{
  "status": "error",
  "message": "File terlalu besar. Maksimal 5MB."
}
```

### CV Parsing Error
```json
{
  "status": "error",
  "message": "Gagal mengextract text dari CV. Pastikan file tidak corrupt dan berisi teks."
}
``` 