# API Endpoints Documentation

## Base URL

```
Development: http://localhost:3000/api
Production: https://hvac-djawara.vercel.app/api
```

## Authentication

All endpoints require Supabase Auth token in headers:

```
Authorization: Bearer <supabase_access_token>
```

## Daily Attendance

### GET /api/attendance
Get attendance records with filters

**Query Parameters:**
- date, startDate, endDate (optional): Date filters
- technicianId (optional): Filter by technician
- status (optional): Filter by status

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "technician_name": "John Doe",
      "date": "2025-12-13",
      "clock_in_time": "2025-12-13T09:15:00Z",
      "total_work_hours": 8.25,
      "is_late": true,
      "attendance_status": "Late"
    }
  ],
  "count": 1
}
```

### POST /api/attendance/clock-in
Technician clock in

**Request Body:**
```json
{
  "date": "2025-12-13",
  "notes": "optional notes"
}
```

### POST /api/attendance/clock-out
Technician clock out

**Request Body:**
```json
{
  "attendanceId": "uuid",
  "notes": "optional notes"
}
```

## Overtime Requests

### GET /api/overtime
Get overtime requests

**Query Parameters:**
- status (optional): pending/approved/rejected/completed
- technicianId (optional): Filter by technician
- startDate, endDate (optional): Date range
- needsReview (optional): Filter requests needing review

### POST /api/overtime
Create overtime request

**Request Body:**
```json
{
  "jobId": "uuid",
  "requestDate": "2025-12-13",
  "reason": "Emergency repair",
  "estimatedStartTime": "17:00:00",
  "estimatedEndTime": "20:00:00"
}
```

### PATCH /api/overtime/[id]/approve
Approve overtime request (Admin/Coordinator only)

**Request Body:**
```json
{
  "notes": "Approved for emergency repair"
}
```

### PATCH /api/overtime/[id]/reject
Reject overtime request

**Request Body:**
```json
{
  "rejectionReason": "Not justified"
}
```

### PATCH /api/overtime/[id]/complete
Complete overtime with actual times

**Request Body:**
```json
{
  "actualStartTime": "2025-12-13T17:00:00Z",
  "actualEndTime": "2025-12-13T20:30:00Z"
}
```

## Technician Availability

### GET /api/availability
Get technician availability

**Query Parameters:**
- date (optional): Specific date
- startDate, endDate (optional): Date range
- technicianId (optional): Filter by technician

### POST /api/availability
Set technician availability

**Request Body:**
```json
{
  "date": "2025-12-13",
  "isAvailable": false,
  "reason": "Sick leave"
}
```

### PATCH /api/availability/[id]
Update availability

**Request Body:**
```json
{
  "isAvailable": true,
  "maxJobsPerDay": 3
}
```

### GET /api/availability/calendar
Get availability calendar view

**Query Parameters:**
- month (required): Month (YYYY-MM)

## Service Orders (Extended)

### PATCH /api/orders/[id]/start
Start service order

**Request Body:**
```json
{
  "actualStartTime": "2025-12-13T10:00:00Z"
}
```

### PATCH /api/orders/[id]/complete
Complete service order

**Request Body:**
```json
{
  "actualEndTime": "2025-12-13T14:30:00Z",
  "notes": "Completed successfully"
}
```

### GET /api/orders/[id]/history
Get order status history

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "old_status": "pending",
      "new_status": "confirmed",
      "changed_by_name": "Admin User",
      "changed_by_role": "admin",
      "created_at": "2025-12-13T09:00:00Z"
    }
  ]
}
```

## Working Hours Config

### GET /api/config/working-hours
Get working hours configuration

### PATCH /api/config/working-hours
Update working hours config (Owner only)

**Request Body:**
```json
{
  "workStartTime": "08:30:00",
  "workEndTime": "17:30:00",
  "overtimeRatePerHour": 6000.00,
  "maxOvertimeHoursPerDay": 4
}
```

## Dashboard & Reports

### GET /api/dashboard/stats
Get dashboard statistics

**Response:**
```json
{
  "data": {
    "attendance": {
      "total_technicians": 10,
      "present_today": 8,
      "late_today": 2
    },
    "overtime": {
      "pending_requests": 3,
      "total_overtime_hours": 48.5,
      "total_overtime_cost": 242500
    }
  }
}
```

### GET /api/reports/attendance
Generate attendance report

**Query Parameters:**
- startDate (required), endDate (required): Date range
- format (optional): json/csv/pdf

### GET /api/reports/overtime
Generate overtime report

**Query Parameters:**
- month (required): Month (YYYY-MM)
- format (optional): json/csv/pdf

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid request",
  "message": "Missing required field: date"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "You don't have permission to perform this action"
}
```

### 404 Not Found
```json
{
  "error": "Not found",
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

## Rate Limiting

- **Rate Limit:** 100 requests per minute per user
- **Header:** X-RateLimit-Remaining

## Pagination

For list endpoints:

**Query Parameters:**
- page (default: 1)
- limit (default: 20, max: 100)

**Response Headers:**
- X-Total-Count: Total number of items
- X-Page: Current page
- X-Per-Page: Items per page
