# SafeZone API Testing Guide

## Base URL: http://localhost:3000/api

## Authentication Endpoints

### 1. Login
**POST** `/api/auth/login`
```json
{
  "email": "admin@safezone.edu",
  "password": "admin123",
  "role": "admin"
}
```

### 2. Register New User
**POST** `/api/auth/register`
```json
{
  "firstName": "Test",
  "lastName": "User",
  "email": "test@student.edu", 
  "password": "password123",
  "role": "student",
  "studentId": "STU2024005"
}
```

### 3. Get Current User (requires token)
**GET** `/api/auth/me`
**Headers**: `Authorization: Bearer YOUR_TOKEN_HERE`

### 4. Update Profile (requires token)
**PUT** `/api/auth/profile`
**Headers**: `Authorization: Bearer YOUR_TOKEN_HERE`
```json
{
  "firstName": "Updated",
  "lastName": "Name",
  "phoneNumber": "555-1234"
}
```

## Emergency Report Endpoints

### 5. Create Emergency Report
**POST** `/api/emergency/report`
```json
{
  "title": "Fire Emergency",
  "description": "Smoke detected in building",
  "category": "fire",
  "location": "Main Building Floor 3",
  "priority": "critical",
  "isAnonymous": false
}
```

### 6. Get All Emergency Reports (Admin only)
**GET** `/api/emergency/reports?status=pending&priority=critical`
**Headers**: `Authorization: Bearer ADMIN_TOKEN`

### 7. Get My Emergency Reports (requires token)
**GET** `/api/emergency/my-reports`
**Headers**: `Authorization: Bearer YOUR_TOKEN`

## Complaint Endpoints

### 8. Create Complaint
**POST** `/api/complaint/report`
```json
{
  "title": "Broken Elevator",
  "description": "Elevator in dorm has been out of order",
  "category": "facility",
  "location": "Dorm Building B",
  "priority": "medium"
}
```

### 9. Get All Complaints (Admin only)
**GET** `/api/complaint/reports?category=facility&status=pending`
**Headers**: `Authorization: Bearer ADMIN_TOKEN`

## Admin Endpoints

### 10. Admin Dashboard
**GET** `/api/admin/dashboard`
**Headers**: `Authorization: Bearer ADMIN_TOKEN`

## Test Credentials

**Admin Login:**
- Email: admin@safezone.edu
- Password: admin123
- Role: admin

**Student Login:**
- Email: john.doe@student.edu
- Password: student123
- Role: student

## How to Test:

1. **Use Postman/Thunder Client/REST Client** extensions in VS Code
2. **Use curl commands** in terminal
3. **Use the frontend interface** once it's connected to these APIs

## Example curl command:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@safezone.edu","password":"admin123","role":"admin"}'
```
