# Gerbang Business Logic Implementation Guide

## Overview
This guide provides practical implementation patterns for the business logic rules defined in `GERBANG_BUSINESS_LOGIC_RULES.md`.

## Implementation Patterns

### 1. Mode-Specific Processing Pattern

```typescript
// Pattern for handling different modes
async function processTapByMode(
  input: GerbangTapInputWithMode,
  attendanceMode: AbsensiMode
): Promise<GerbangServiceResponse> {
  
  // Common validation (Rules C1-C4)
  await validateCommonRules(input);
  
  switch (attendanceMode) {
    case AbsensiMode.SIMPLE:
      return await processSimpleModeTap(input);
    
    case AbsensiMode.MULTI_SESI:
      return await processMultiSesiModeTap(input);
    
    default:
      throw new Error('Unsupported attendance mode');
  }
}
```

### 2. Validation Chain Pattern

```typescript
// Pattern for sequential validation (Rules S1, M1, C1-C4)
class GerbangValidationChain {
  private validators: Array<(input: any) => Promise<void>> = [];
  
  addValidator(validator: (input: any) => Promise<void>) {
    this.validators.push(validator);
    return this;
  }
  
  async validate(input: any): Promise<void> {
    for (const validator of this.validators) {
      await validator(input);
    }
  }
}

// Usage
const validationChain = new GerbangValidationChain()
  .addValidator(validateTenant)
  .addValidator(validateStudent)
  .addValidator(validateTapType)
  .addValidator(validateDuplicateTap);
```

### 3. Session Management Pattern

```typescript
// Pattern for session handling (Rules S2, M2)
class GerbangSessionManager {
  async getOrCreateSession(
    tenantId: string, 
    date: Date,
    mode: AbsensiMode
  ): Promise<SesiGerbang> {
    
    const existingSession = await this.findSessionByDate(tenantId, date);
    
    if (existingSession) {
      return existingSession;
    }
    
    return await this.createDefaultSession(tenantId, date, mode);
  }
  
  private async createDefaultSession(
    tenantId: string, 
    date: Date,
    mode: AbsensiMode
  ): Promise<SesiGerbang> {
    const sessionConfig = await this.getSessionConfig(tenantId, mode);
    
    return await prisma.sesiGerbang.create({
      data: {
        tenant_id: tenantId,
        tanggal: date,
        waktu_mulai: sessionConfig.defaultStartTime,
        waktu_selesai: sessionConfig.defaultEndTime,
        status: 'AKTIF'
      }
    });
  }
}
```

### 4. Duplicate Prevention Pattern

```typescript
// Pattern for duplicate detection (Rule S3)
class DuplicateDetector {
  async checkDuplicateTap(
    siswaId: string,
    sesiGerbangId: string,
    arah: JenisTap
  ): Promise<boolean> {
    
    const existingTap = await prisma.absenGerbangSiswa.findFirst({
      where: {
        siswa_id: siswaId,
        sesi_gerbang_id: sesiGerbangId,
        arah: arah
      }
    });
    
    return !!existingTap;
  }
  
  async getLastTap(
    siswaId: string,
    sesiGerbangId: string
  ): Promise<AbsenGerbangSiswa | null> {
    
    return await prisma.absenGerbangSiswa.findFirst({
      where: {
        siswa_id: siswaId,
        sesi_gerbang_id: sesiGerbangId
      },
      orderBy: {
        waktu_tap: 'desc'
      }
    });
  }
}
```

### 5. Integration Context Pattern

```typescript
// Pattern for MULTI_SESI integration (Rules M2-M5)
class IntegrationContextManager {
  async buildIntegrationContext(
    siswaId: string,
    tenantId: string,
    arah: JenisTap
  ): Promise<GerbangIntegrationStatus> {
    
    const activeActivities = await this.getActiveActivities(tenantId);
    const studentEligibility = await this.checkStudentEligibility(siswaId, activeActivities);
    
    return {
      has_active_activities: activeActivities.length > 0,
      student_eligible_for_activities: studentEligibility.eligible,
      prerequisite_fulfilled: arah === JenisTap.MASUK,
      integration_ready: true,
      activity_sessions: activeActivities.map(activity => ({
        sesi_id: activity.id,
        nama_kegiatan: activity.jenis_kegiatan,
        waktu_mulai: activity.waktu_mulai,
        waktu_selesai: activity.waktu_selesai,
        requires_gate_tap: true
      }))
    };
  }
  
  private async getActiveActivities(tenantId: string): Promise<SesiAbsensi[]> {
    const now = new Date();
    
    return await prisma.sesiAbsensi.findMany({
      where: {
        tenant_id: tenantId,
        tanggal: {
          gte: startOfDay(now),
          lte: endOfDay(now)
        },
        waktu_mulai: {
          lte: addHours(now, 2) // Activities starting within 2 hours
        },
        waktu_selesai: {
          gte: now // Not yet finished
        }
      }
    });
  }
}
```

### 6. Error Handling Pattern

```typescript
// Pattern for consistent error handling (Rules E1-E4)
class GerbangErrorHandler {
  static handleValidationError(error: any): GerbangErrorDetails {
    return {
      type: GerbangErrorType.VALIDATION_ERROR,
      message: 'Validation failed',
      details: error.details,
      validation_errors: error.validationErrors
    };
  }
  
  static handleDuplicateTap(lastTap: AbsenGerbangSiswa): GerbangErrorDetails {
    return {
      type: GerbangErrorType.DUPLICATE_TAP,
      message: `Duplicate ${lastTap.arah} tap detected`,
      details: {
        last_tap_time: lastTap.waktu_tap,
        last_tap_direction: lastTap.arah
      }
    };
  }
  
  static handleStudentNotFound(siswaId: string): GerbangErrorDetails {
    return {
      type: GerbangErrorType.STUDENT_NOT_FOUND,
      message: 'Student not found or inactive',
      details: { siswa_id: siswaId }
    };
  }
}
```

### 7. Response Builder Pattern

```typescript
// Pattern for consistent response structure (Rules R1-R2)
class GerbangResponseBuilder {
  static buildSuccessResponse(
    absenRecord: AbsenGerbangSiswa,
    metadata: GerbangTapMetadata
  ): GerbangServiceResponse {
    return {
      success: true,
      message: `${metadata.tap_info.arah} tap recorded successfully`,
      data: {
        absen_record: absenRecord,
        attendance_mode: metadata.attendance_mode,
        siswa_info: metadata.siswa_info,
        session_info: metadata.session_info,
        tap_info: metadata.tap_info,
        integration_status: metadata.integration_status
      }
    };
  }
  
  static buildErrorResponse(error: GerbangErrorDetails): GerbangServiceResponse {
    return {
      success: false,
      error: error
    };
  }
}
```

### 8. Activity Logging Pattern

```typescript
// Pattern for comprehensive logging (Rules S4, M5, L1)
class GerbangActivityLogger {
  async logTapActivity(
    input: GerbangTapInputWithMode,
    result: AbsenGerbangSiswa,
    metadata: GerbangTapMetadata
  ): Promise<void> {
    
    const logMetadata = this.buildLogMetadata(input, result, metadata);
    
    await prisma.activityLog.create({
      data: {
        tenant_id: input.tenantId,
        user_id: input.siswa_id,
        action: 'ABSEN_GERBANG',
        entity: 'AbsenGerbangSiswa',
        entity_id: result.id,
        metadata: logMetadata
      }
    });
  }
  
  private buildLogMetadata(
    input: GerbangTapInputWithMode,
    result: AbsenGerbangSiswa,
    metadata: GerbangTapMetadata
  ): GerbangActivityLogMetadata {
    
    const baseMetadata: GerbangActivityLogMetadata = {
      description: `Student ${metadata.siswa_info.nama} tapped ${input.arah} at gate`,
      arah: input.arah,
      siswa_id: input.siswa_id,
      siswa_nama: metadata.siswa_info.nama,
      attendance_mode: metadata.attendance_mode,
      sesi_gerbang_id: result.sesi_gerbang_id,
      device_id: input.device_id,
      rfid: input.rfid
    };
    
    // Add integration context for MULTI_SESI mode
    if (metadata.attendance_mode === AbsensiMode.MULTI_SESI && metadata.integration_status) {
      baseMetadata.integration_context = {
        has_active_activities: metadata.integration_status.has_active_activities,
        prerequisite_fulfilled: metadata.integration_status.prerequisite_fulfilled,
        activity_sessions_count: metadata.integration_status.activity_sessions?.length || 0
      };
    }
    
    return baseMetadata;
  }
}
```

### 9. Configuration Management Pattern

```typescript
// Pattern for mode and tenant configuration (Rules CFG1-CFG3)
class GerbangConfigManager {
  async getTenantConfig(tenantId: string): Promise<GerbangTenantConfig> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        absensi_mode: true,
        // Add other configuration fields as needed
      }
    });
    
    if (!tenant) {
      throw new Error('Tenant not found');
    }
    
    return {
      attendanceMode: tenant.absensi_mode,
      sessionConfig: await this.getSessionConfig(tenantId),
      integrationConfig: await this.getIntegrationConfig(tenantId)
    };
  }
  
  private async getSessionConfig(tenantId: string): Promise<SessionConfig> {
    // Return default or tenant-specific session configuration
    return {
      defaultStartTime: '07:00:00',
      defaultEndTime: '17:00:00',
      allowMultipleSessions: false,
      autoCreateSessions: true
    };
  }
}
```

### 10. Performance Optimization Pattern

```typescript
// Pattern for performance optimization (Rules P1-P3)
class GerbangPerformanceOptimizer {
  private sessionCache = new Map<string, SesiGerbang>();
  private studentCache = new Map<string, any>();
  
  async getSessionWithCache(
    tenantId: string, 
    date: Date
  ): Promise<SesiGerbang> {
    const cacheKey = `${tenantId}-${date.toISOString().split('T')[0]}`;
    
    if (this.sessionCache.has(cacheKey)) {
      return this.sessionCache.get(cacheKey)!;
    }
    
    const session = await this.sessionManager.getOrCreateSession(tenantId, date);
    this.sessionCache.set(cacheKey, session);
    
    return session;
  }
  
  async executeWithTransaction<T>(
    operation: (tx: any) => Promise<T>
  ): Promise<T> {
    return await prisma.$transaction(operation, {
      timeout: 5000, // 5 second timeout
      isolationLevel: 'ReadCommitted'
    });
  }
}
```

## Implementation Checklist

### Phase 1: Core Implementation
- [ ] Implement mode-specific processing pattern
- [ ] Set up validation chain for common rules
- [ ] Implement session management
- [ ] Add duplicate prevention logic
- [ ] Create error handling system

### Phase 2: Integration Features
- [ ] Implement integration context for MULTI_SESI
- [ ] Add activity logging with full metadata
- [ ] Set up configuration management
- [ ] Implement response builders

### Phase 3: Optimization
- [ ] Add performance optimizations
- [ ] Implement caching strategies
- [ ] Add monitoring and metrics
- [ ] Set up rate limiting

### Phase 4: Testing
- [ ] Unit tests for each pattern
- [ ] Integration tests for mode switching
- [ ] Performance tests for high load
- [ ] Error handling tests

## Best Practices

1. **Separation of Concerns**: Keep validation, business logic, and data access separate
2. **Error Handling**: Use consistent error types and messages across all operations
3. **Logging**: Log all important operations with sufficient context for debugging
4. **Performance**: Use transactions for multi-table operations and implement caching where appropriate
5. **Testing**: Write comprehensive tests for each business rule and edge case
6. **Documentation**: Keep business rules and implementation in sync

## Migration Strategy

When implementing these patterns in existing code:

1. Start with the validation chain pattern
2. Implement error handling consistently
3. Add mode-specific processing gradually
4. Enhance logging and monitoring
5. Optimize performance last

This approach ensures minimal disruption while systematically improving the codebase.