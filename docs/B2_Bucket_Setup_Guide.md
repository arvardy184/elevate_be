# 🪣 Backblaze B2 Bucket Setup Guide

## 🚨 Issue: Public File Access

Jika kamu mendapat error `{"code": "unauthorized", "message": "", "status": 401}` saat mengakses file URL, ini karena bucket B2 tidak dikonfigurasi untuk public access.

## 🛠️ Solution: Configure Public Bucket

### **Step 1: Login to Backblaze B2 Console**
1. Go to [Backblaze B2 Cloud Storage](https://www.backblaze.com/b2/cloud-storage.html)
2. Login ke account kamu
3. Navigate ke **Buckets** section

### **Step 2: Update Bucket Settings**

#### **Option A: Create New Public Bucket**
```
1. Click "Create a Bucket"
2. Bucket Name: elevate-be-public (or any name)
3. Files in Bucket are: PUBLIC
4. Object Lock: Disabled
5. Default Encryption: Disabled (atau sesuai kebutuhan)
6. Click "Create a Bucket"
```

#### **Option B: Update Existing Bucket**
```
1. Find bucket "elevate-be" 
2. Click "Bucket Settings"
3. Change "Files in Bucket are" to PUBLIC
4. Save changes
```

### **Step 3: Update Environment Variables**

Jika create bucket baru, update `.env`:
```env
B2_BUCKET_NAME=elevate-be-public
B2_BUCKET_ID=your_new_bucket_id
```

### **Step 4: Test Public Access**

Setelah bucket public, file URLs akan dapat diakses tanpa authorization:

**Before (Private Bucket):**
```
https://f000.backblazeb2.com/file/elevate-be/course-videos/123-video.mp4
❌ Error 401 Unauthorized
```

**After (Public Bucket):**
```
https://f000.backblazeb2.com/file/elevate-be-public/course-videos/123-video.mp4
✅ File accessible
```

## 📋 Bucket Permission Levels

### **Private Bucket**
- ❌ Public access denied
- ✅ Requires authorization headers
- ✅ More secure
- ❌ Complex client implementation

### **Public Bucket**  
- ✅ Public access allowed
- ❌ No authorization needed
- ⚠️ Less secure (anyone can access if they know URL)
- ✅ Simple client implementation

## 🔒 Security Considerations

### **For Course Videos:**
**Recommendation: Use Private Bucket + Signed URLs**

```javascript
// Generate temporary signed URL (expires after X hours)
const signedUrl = await generateSignedUrl(fileName, expiresIn: '2h');
```

### **For Profile Pictures:**
**Recommendation: Public Bucket OK**
- Profile pictures usually public anyway
- No sensitive content

### **For CV Files:**
**Recommendation: Private Bucket + Access Control**
- Sensitive personal documents
- Should require user authentication

## 🚀 Quick Fix for Testing

**Temporary Solution:**
1. Set bucket to PUBLIC untuk testing
2. Restart application
3. Upload new video
4. Test video URL access

**Production Solution:**
1. Keep bucket PRIVATE
2. Implement signed URL generation
3. Return signed URLs instead of direct URLs
4. URLs expire after set time

## 🔧 Code Changes Made

### **Updated URL Generation:**

**Before:**
```javascript
// Authorized URL (requires auth)
fileUrl: `${downloadUrl}/file/${bucketName}/${fileName}`
```

**After:**
```javascript
// Public-friendly URL (works with public buckets)
fileUrl: `https://f${bucketId.slice(0,12)}.backblazeb2.com/file/${bucketName}/${fileName}`
```

## ✅ Verification Steps

1. **Upload new video:**
   ```bash
   POST /api/courses/1/videos
   # Check returned videoUrl format
   ```

2. **Test direct access:**
   ```bash
   curl -I "https://f000.backblazeb2.com/file/elevate-be/course-videos/123-video.mp4"
   # Should return 200 OK (not 401)
   ```

3. **Browser test:**
   ```
   Open videoUrl in browser
   # Should play/download file directly
   ```

## 🎯 Next Steps

1. ✅ Set bucket to PUBLIC
2. ✅ Test new video upload  
3. ✅ Verify URL access works
4. 🚀 Implement signed URLs for production security

**Need help?** Contact Backblaze support atau cek [B2 Documentation](https://www.backblaze.com/b2/docs/). 