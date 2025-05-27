# 🩺 **Counseling API Testing Guide**

Dokumentasi lengkap untuk testing API counseling yang sudah kamu implementasi.

---

## **📋 List Endpoint**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/counselors` | ❌ | List semua counselor |
| `GET` | `/api/counselors/:id` | ❌ | Detail counselor |
| `POST` | `/api/counseling-sessions` | ✅ | Buat session baru |
| `GET` | `/api/counseling-sessions/me` | ✅ | My sessions |
| `GET` | `/api/counseling-sessions/:id` | ✅ | Detail session |
| `PUT` | `/api/counseling-sessions/:id/rating` | ✅ | Rate session |
| `WebSocket` | `/` | ✅ | Real-time chat |

---

## **🧪 Test Cases**

### **1. GET /api/counselors**
**List semua counselor yang verified**

```http
GET http://localhost:3009/api/counselors
```

**Query Parameters:**
- `page` (optional): Halaman (default: 1)
- `limit` (optional): Items per page (default: 10)  
- `specialization` (optional): Filter spesialisasi

**Example:**
```http
GET http://localhost:3009/api/counselors?page=1&limit=5&specialization=clinical
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "userId": 5,
      "specialization": "clinical-psychology",
      "bio": "Spesialis psikologi klinis...",
      "verified": true,
      "users": {
        "id": 5,
        "firstName": "Dr. Sarah",
        "lastName": "Johnson",
        "email": "dr.sarah@counseling.com",
        "profilePicture": "https://..."
      },
      "averageRating": 4.5,
      "totalSessions": 12
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalItems": 4,
    "itemsPerPage": 5
  }
}
```

---

### **2. GET /api/counselors/:id**
**Detail counselor berdasarkan ID**

```http
GET http://localhost:3009/api/counselors/1
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 5,
    "specialization": "clinical-psychology",
    "bio": "Spesialis psikologi klinis...",
    "verified": true,
    "users": {
      "id": 5,
      "firstName": "Dr. Sarah",
      "lastName": "Johnson",
      "email": "dr.sarah@counseling.com",
      "profilePicture": "https://..."
    },
    "averageRating": 4.5,
    "totalSessions": 12,
    "recentReviews": [
      {
        "rating": 5,
        "feedback": "Sangat membantu",
        "users": { "name": "John Doe" }
      }
    ]
  }
}
```

---

### **3. POST /api/counseling-sessions**
**Buat session counseling baru**

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Body:**
```json
{
  "counselorId": 1,
  "topic": "Anxiety Management",
  "question": "Saya merasa cemas berlebihan akhir-akhir ini dan ingin belajar cara mengelolanya dengan lebih baik."
}
```

**Expected Response (Free Counseling):**
```json
{
  "success": true,
  "message": "Session counseling berhasil dibuat",
  "data": {
    "session": {
      "id": 1,
      "userId": 1,
      "counselorId": 1,
      "topic": "Anxiety Management",
      "question": "Saya merasa cemas berlebihan...",
      "status": "ACTIVE",
      "isPaymentRequired": false,
      "price": null,
      "createdAt": "2025-01-23T10:00:00.000Z"
    },
    "payment": null
  }
}
```

**Expected Response (Premium Counseling - Perlu Bayar):**
```json
{
  "success": true,
  "message": "Session counseling berhasil dibuat",
  "data": {
    "session": {
      "id": 2,
      "userId": 1,
      "counselorId": 1,
      "topic": "Career Planning",
      "question": "Saya bingung memilih jalur karir...",
      "status": "PENDING",
      "isPaymentRequired": true,
      "price": 150000,
      "createdAt": "2025-01-23T10:00:00.000Z"
    },
    "payment": {
      "snapToken": "deb1298f-ced2-4006-bd17-9a87908840dc",
      "redirectUrl": "https://app.sandbox.midtrans.com/snap/v4/redirection/...",
      "orderId": "ORDER-1748011201159-485"
    }
  }
}
```

---

### **4. GET /api/counseling-sessions/me**
**List session counseling milik user**

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Query Parameters:**
- `status` (optional): PENDING, ACTIVE, COMPLETED, CANCELLED
- `page` (optional): Halaman
- `limit` (optional): Items per page

```http
GET http://localhost:3009/api/counseling-sessions/me?status=ACTIVE&page=1&limit=10
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "userId": 1,
      "counselorId": 1,
      "topic": "Anxiety Management",
      "status": "ACTIVE",
      "isPaymentRequired": false,
      "price": null,
      "createdAt": "2025-01-23T10:00:00.000Z",
      "counselor": {
        "id": 1,
        "specialization": "clinical-psychology",
        "users": {
          "id": 5,
          "firstName": "Dr. Sarah",
          "lastName": "Johnson",
          "profilePicture": "https://..."
        }
      },
      "payment": null,
      "_count": {
        "chatmessage": 5
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalItems": 1,
    "itemsPerPage": 10
  }
}
```

---

### **5. GET /api/counseling-sessions/:id**
**Detail session counseling**

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

```http
GET http://localhost:3009/api/counseling-sessions/1
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 1,
    "counselorId": 1,
    "topic": "Anxiety Management",
    "question": "Saya merasa cemas berlebihan...",
    "response": null,
    "status": "ACTIVE",
    "isPaymentRequired": false,
    "price": null,
    "createdAt": "2025-01-23T10:00:00.000Z",
    "rating": null,
    "feedback": null,
    "counselor": {
      "id": 1,
      "users": {
        "id": 5,
        "firstName": "Dr. Sarah",
        "lastName": "Johnson",
        "email": "dr.sarah@counseling.com",
        "profilePicture": "https://..."
      }
    },
    "users": {
      "id": 1,
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "profilePicture": null
    },
    "payment": null,
    "chatmessage": [
      {
        "id": 1,
        "message": "Halo, saya Dr. Sarah. Bagaimana kabar Anda hari ini?",
        "sentAt": "2025-01-23T10:05:00.000Z",
        "users": {
          "id": 5,
          "firstName": "Dr. Sarah",
          "lastName": "Johnson",
          "profilePicture": "https://..."
        }
      }
    ]
  }
}
```

---

### **6. PUT /api/counseling-sessions/:id/rating**
**Rate dan beri feedback session yang completed**

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Body:**
```json
{
  "rating": 5,
  "feedback": "Konseling sangat membantu. Dr. Arvan sangat profesional dan empati."
}
```

```http
PUT http://localhost:3009/api/counseling-sessions/1/rating
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Rating berhasil diberikan",
  "data": {
    "id": 1,
    "userId": 1,
    "counselorId": 1,
    "rating": 5,
    "feedback": "Konseling sangat membantu...",
    "status": "COMPLETED"
  }
}
```

---

## **💬 WebSocket Chat Testing**

### **Connection & Authentication**

**Connect to WebSocket:**
```javascript
const socket = io('http://localhost:3009');

// Authenticate
socket.emit('authenticate', {
  token: 'your_jwt_token',
  sessionId: 1
});

// Listen for auth success
socket.on('authenticated', (data) => {
  console.log('Connected:', data);
});
```

### **Send Message**
```javascript
socket.emit('send_message', {
  message: 'Halo Dr. Sarah, saya ingin membahas tentang kecemasan saya.',
  type: 'text'
});
```

### **Listen for New Messages**
```javascript
socket.on('new_message', (data) => {
  console.log('New message:', data);
  // data format:
  // {
  //   id: 1,
  //   message: "Hello...",
  //   sentAt: "2025-01-23T10:05:00.000Z",
  //   sender: {
  //     id: 1,
  //     name: "John Doe",
  //     profileImage: "https://...",
  //     role: "client" // or "counselor"
  //   }
  // }
});
```

### **Typing Indicators**
```javascript
// Start typing
socket.emit('typing_start');

// Stop typing
socket.emit('typing_stop');

// Listen for typing
socket.on('user_typing', (data) => {
  console.log('User typing:', data);
});
```

### **Complete Session (Counselor Only)**
```javascript
socket.emit('complete_session', {
  response: "Sesi konseling telah selesai. Anda sudah menunjukkan progress yang baik dalam mengelola kecemasan. Lanjutkan teknik-teknik yang sudah kita bahas."
});

socket.on('session_completed', (data) => {
  console.log('Session completed:', data);
});
```

---

## **🔧 Troubleshooting**

### **Common Errors**

1. **401 Unauthorized** - Token invalid atau expired
2. **403 Forbidden** - User tidak memiliki akses ke session
3. **404 Not Found** - Counselor/Session tidak ditemukan
4. **400 Bad Request** - Data input tidak valid

### **Testing Flow**

1. **Setup**: Pastikan server berjalan di port 3009
2. **Auth**: Login user untuk dapatkan JWT token
3. **List Counselors**: Test endpoint GET `/api/counselors`
4. **Create Session**: Test POST `/api/counseling-sessions`
5. **Chat**: Test WebSocket connection & messaging
6. **Complete**: Test rating system

---

## **💡 Tips Testing**

- **Use Postman** untuk HTTP requests
- **Use Socket.IO Client** untuk WebSocket testing
- **Check Network Tab** di browser untuk debug
- **Use different user accounts** untuk test role-based access
- **Test payment flow** dengan Midtrans sandbox

---

✅ **API Counseling Implementation Complete!** 