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

## 📋 API Endpoints

### 1. Job Matching (Main Endpoint)
```
POST /api/job-matching/match
Authorization: Bearer {token}
Content-Type: application/json

Body Options:

Option A - With CV Review:
{
  "dreamJob": "Software Engineer",
  "cvReviewId": "clxxxxx-xxxx-xxxx"
}

Option B - Without CV:
{
  "dreamJob": "Data Scientist"
}
```

**Response:**
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

### 2. Get Job Details
```
GET /api/job-matching/jobs/{id}
```

### 3. Get Job Categories
```
GET /api/job-matching/categories
```

### 4. Get Matching History
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

### Case 3: Upload CV Baru untuk Job Matching
```
1. POST /api/cv-review/upload 
   - cv: new_cv.pdf
   - careerField: "DevOps Engineer"
   
2. POST /api/job-matching/match
   - dreamJob: "DevOps Engineer"  
   - cvReviewId: {id_from_step_1}
```

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