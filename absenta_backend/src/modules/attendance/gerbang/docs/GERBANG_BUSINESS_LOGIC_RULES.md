# Gerbang Module Business Logic Rules

## Overview
This document defines the comprehensive business logic rules for the Gerbang (Gate) module, which supports dual-mode operations: SIMPLE and MULTI_SESI attendance modes.

## Core Concepts

### 1. Attendance Modes
- **SIMPLE Mode**: Basic gate tap functionality for general attendance tracking
- **MULTI_SESI Mode**: Advanced gate tap that serves as prerequisite for activity-based attendance

### 2. Tap Types (JenisTap)
- **MASUK**: Entry tap
- **KELUAR**: Exit tap

## Business Logic Rules by Mode

### SIMPLE Mode Rules

#### Rule S1: Basic Tap Validation
- **Condition**: Mode = SIMPLE
- **Logic**: 
  - Validate siswa_id exists and belongs to tenant
  - Validate arah (MASUK/KELUAR) is valid JenisTap enum
  - Check for duplicate taps within same session
- **Response**: Simple success/failure with basic metadata

#### Rule S2: Session Management
- **Condition**: Mode = SIMPLE
- **Logic**:
  - Create or use existing SesiGerbang for current date
  - One session per day per tenant
  - Session auto-created with default time range (07:00-17:00)
- **Response**: Include session info in metadata

#### Rule S3: Duplicate Prevention
- **Condition**: Mode = SIMPLE
- **Logic**:
  - Check for existing AbsenGerbangSiswa record for same siswa, session, and arah
  - Allow multiple taps of different arah (MASUK then KELUAR)
  - Prevent duplicate taps of same arah within same session
- **Error**: Return specific duplicate tap error

#### Rule S4: Activity Log
- **Condition**: Mode = SIMPLE
- **Logic**:
  - Log basic tap information
  - Include siswa info, tap direction, and timestamp
  - No integration context required
- **Metadata**: Basic tap details only

### MULTI_SESI Mode Rules

#### Rule M1: Enhanced Tap Validation
- **Condition**: Mode = MULTI_SESI
- **Logic**:
  - All SIMPLE mode validations apply
  - Additional validation for integration readiness
  - Check for active activity sessions that require gate prerequisite
- **Response**: Enhanced metadata with integration status

#### Rule M2: Integration Context
- **Condition**: Mode = MULTI_SESI
- **Logic**:
  - Gate tap serves as prerequisite for activity attendance
  - Check for upcoming/active SesiAbsensi that require gate tap
  - Validate student eligibility for activities
- **Response**: Include integration_context with activity readiness

#### Rule M3: Activity Prerequisites
- **Condition**: Mode = MULTI_SESI AND arah = MASUK
- **Logic**:
  - Mark student as eligible for activity attendance
  - Update integration status to indicate gate prerequisite fulfilled
  - Enable activity tap functionality for the student
- **Response**: Include prerequisite fulfillment status

#### Rule M4: Exit Validation
- **Condition**: Mode = MULTI_SESI AND arah = KELUAR
- **Logic**:
  - Check if student has pending activity sessions
  - Warn if student is leaving with incomplete activities
  - Update integration status accordingly
- **Response**: Include activity completion status

#### Rule M5: Enhanced Activity Log
- **Condition**: Mode = MULTI_SESI
- **Logic**:
  - Log comprehensive tap information
  - Include integration context and activity readiness
  - Track prerequisite fulfillment status
- **Metadata**: Full integration details

## Cross-Mode Rules

### Rule C1: Tenant Validation
- **Condition**: All modes
- **Logic**:
  - Validate tenant exists and is active
  - Ensure tenant supports the requested attendance mode
  - Check tenant-specific configurations
- **Error**: Return tenant validation error if invalid

### Rule C2: Student Validation
- **Condition**: All modes
- **Logic**:
  - Validate siswa_id exists in tenant
  - Check student is active and not suspended
  - Verify student belongs to requesting tenant
- **Error**: Return student not found or inactive error

### Rule C3: Device Integration
- **Condition**: All modes (when device_id provided)
- **Logic**:
  - Validate device_id if provided
  - Log device information for audit trail
  - Support RFID integration when available
- **Response**: Include device info in metadata

### Rule C4: Time Validation
- **Condition**: All modes
- **Logic**:
  - Validate tap timestamp is reasonable (not future, not too old)
  - Check against session time boundaries
  - Handle timezone considerations
- **Error**: Return time validation error if invalid

## Error Handling Rules

### Rule E1: Validation Errors
- **Types**: VALIDATION_ERROR
- **Handling**: Return 400 with specific validation details
- **Logging**: Log validation failures for monitoring

### Rule E2: Business Logic Errors
- **Types**: DUPLICATE_TAP, STUDENT_NOT_FOUND, INVALID_SESSION
- **Handling**: Return 409 for conflicts, 404 for not found
- **Logging**: Log business logic violations

### Rule E3: Integration Errors
- **Types**: INTEGRATION_FAILURE, PREREQUISITE_NOT_MET
- **Handling**: Return 422 for integration issues
- **Logging**: Log integration failures for debugging

### Rule E4: System Errors
- **Types**: DATABASE_ERROR, INTERNAL_ERROR
- **Handling**: Return 500 with generic error message
- **Logging**: Log full error details for investigation

## Response Structure Rules

### Rule R1: Success Response
```typescript
{
  success: true,
  message: string,
  data: {
    absen_record: AbsenGerbangSiswa,
    attendance_mode: AbsensiMode,
    siswa_info: { id, nama, kelas },
    session_info: { id, tanggal, waktu_mulai, waktu_selesai },
    tap_info: { arah, waktu_tap, device_id?, rfid? },
    integration_status?: GerbangIntegrationStatus // MULTI_SESI only
  }
}
```

### Rule R2: Error Response
```typescript
{
  success: false,
  error: {
    type: GerbangErrorType,
    message: string,
    details?: any,
    validation_errors?: GerbangValidationErrors
  }
}
```

## Performance Rules

### Rule P1: Database Optimization
- Use transactions for multi-table operations
- Implement proper indexing for frequent queries
- Cache session data when appropriate

### Rule P2: Response Time
- Target response time < 200ms for tap operations
- Implement timeout handling for external integrations
- Use async processing for non-critical operations

### Rule P3: Concurrency
- Handle concurrent taps from same student
- Implement proper locking for duplicate prevention
- Support high-throughput scenarios

## Security Rules

### Rule SEC1: Data Validation
- Sanitize all input parameters
- Validate data types and ranges
- Prevent SQL injection and XSS attacks

### Rule SEC2: Access Control
- Validate tenant access permissions
- Ensure student data privacy
- Log all access attempts for audit

### Rule SEC3: Rate Limiting
- Implement rate limiting per device/student
- Prevent abuse and spam taps
- Monitor for suspicious patterns

## Integration Rules

### Rule I1: Activity Module Integration
- **Condition**: Mode = MULTI_SESI
- **Logic**: Coordinate with activity module for prerequisite tracking
- **Fallback**: Graceful degradation if activity module unavailable

### Rule I2: Notification Integration
- **Condition**: Configurable per tenant
- **Logic**: Send notifications for important events (first tap, exit without activities)
- **Fallback**: Continue operation if notification fails

### Rule I3: Reporting Integration
- **Condition**: All modes
- **Logic**: Provide data for attendance reports and analytics
- **Requirements**: Maintain data consistency for reporting

## Monitoring and Logging Rules

### Rule L1: Audit Trail
- Log all tap operations with full context
- Include user, timestamp, and operation details
- Maintain logs for compliance and debugging

### Rule L2: Performance Monitoring
- Track response times and error rates
- Monitor database performance
- Alert on anomalies and failures

### Rule L3: Business Metrics
- Track tap volumes by mode and time
- Monitor integration success rates
- Provide insights for optimization

## Configuration Rules

### Rule CFG1: Mode Configuration
- Allow tenant-level mode configuration
- Support mode switching with proper migration
- Validate configuration changes

### Rule CFG2: Session Configuration
- Allow customizable session time ranges
- Support multiple sessions per day (future enhancement)
- Validate session configurations

### Rule CFG3: Integration Configuration
- Configure integration endpoints and timeouts
- Support feature flags for optional integrations
- Allow per-tenant integration settings