import { XMLParser } from 'fast-xml-parser';
import bcrypt from 'bcrypt';
import { prisma } from '@/utils/prisma';

export interface EntityMappingInput {
  asc_id: string;
  name: string;
  code?: string;
  target_id?: string; // Existing DB ID or null if create new
  action: 'MATCH' | 'CREATE' | 'IGNORE';
}

export interface ExecuteAscImportInput {
  tahun_pelajaran_id: string;
  semester_id: string;
  filename: string;
  teacher_mappings: EntityMappingInput[];
  class_mappings: EntityMappingInput[];
  subject_mappings: EntityMappingInput[];
  xml_content: string;
  user_id?: string;
}

export class AscImporterService {
  private static normalizeName(str: string): string {
    return String(str || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/gi, '')
      .trim();
  }

  static parseXml(xmlContent: string) {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: true,
    });
    const parsed = parser.parse(xmlContent);
    if (!parsed?.timetable) {
      throw new Error('File XML tidak valid. Node <timetable> tidak ditemukan.');
    }
    return parsed.timetable;
  }

  /**
   * Dynamically extract period start & end times directly from XML <periods>
   */
  static extractPeriodTimes(timetable: any): Record<number, { start: string; end: string }> {
    const periodMap: Record<number, { start: string; end: string }> = {};
    const rawPeriods = timetable.periods?.period || [];
    const periodsArr = Array.isArray(rawPeriods) ? rawPeriods : [rawPeriods];

    periodsArr.forEach((p: any) => {
      const slotNum = Number(p.period);
      if (!isNaN(slotNum)) {
        let start = String(p.starttime || '').trim();
        let end = String(p.endtime || '').trim();

        if (start && start.includes(':')) {
          const [h, m] = start.split(':');
          start = `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
        }
        if (end && end.includes(':')) {
          const [h, m] = end.split(':');
          end = `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
        }

        if (start && end && start !== '00:00' && end !== '00:00' && start !== end) {
          periodMap[slotNum] = { start, end };
        }
      }
    });

    // Default Jam 0 if missing in XML
    if (!periodMap[0]) {
      periodMap[0] = { start: '06:30', end: '07:00' };
    }

    return periodMap;
  }

  /**
   * Dynamically extract days mapping directly from XML <daysdefs>
   */
  static extractDaysdefs(timetable: any): Map<string, { bitmask: string; name: string }> {
    const daysMap = new Map<string, { bitmask: string; name: string }>();
    const rawDays = timetable.daysdefs?.daysdef || [];
    const daysArr = Array.isArray(rawDays) ? rawDays : [rawDays];

    daysArr.forEach((d: any) => {
      const dId = String(d.id);
      const dName = String(d.name || d.short || '').toUpperCase();
      const dBit = String(d.days || '');

      const entry = { bitmask: dBit, name: dName };
      daysMap.set(dId, entry);
      if (dBit) daysMap.set(dBit, entry);
    });

    return daysMap;
  }

  /**
   * Resolve list of days from daysdefId or days bitmask string (e.g. 10000 -> SENIN, 11111 -> SENIN..JUMAT)
   */
  static resolveDaysFromXml(daysInput: string, daysdefsMap: Map<string, { bitmask: string; name: string }>): string[] {
    const rawInput = String(daysInput || '').trim();
    if (!rawInput) return ['SENIN'];

    const foundDef = daysdefsMap.get(rawInput);
    const bitmask = foundDef ? foundDef.bitmask : (rawInput.length >= 5 && /^[01]+$/.test(rawInput) ? rawInput : '');

    const dayNames = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
    const resolvedDays: string[] = [];

    if (bitmask) {
      for (let i = 0; i < bitmask.length; i++) {
        if (bitmask[i] === '1' && dayNames[i]) {
          resolvedDays.push(dayNames[i]);
        }
      }
    }

    if (resolvedDays.length === 0) {
      if (foundDef?.name.includes('SENIN')) resolvedDays.push('SENIN');
      else if (foundDef?.name.includes('SELASA')) resolvedDays.push('SELASA');
      else if (foundDef?.name.includes('RABU')) resolvedDays.push('RABU');
      else if (foundDef?.name.includes('KAMIS')) resolvedDays.push('KAMIS');
      else if (foundDef?.name.includes('JUMAT')) resolvedDays.push('JUMAT');
      else if (foundDef?.name.includes('SABTU')) resolvedDays.push('SABTU');
      else resolvedDays.push('SENIN');
    }

    return resolvedDays;
  }

  /**
   * Smart Day-Pattern Slot Resolver:
   * 1. Checks DB Tenant 'shift_jam_pelajaran' config for day-specific bell schedule (Senin 07:50, Jumat 07:35, etc.)
   * 2. Fallback to XML <periods> starttime & endtime
   * 3. Fallback to default 07:00
   */
  static async resolveSlotTimesForDay(
    tenantId: string,
    kelasId: string,
    dayName: string,
    slotIndex: number,
    xmlPeriodTimes: Record<number, { start: string; end: string }>
  ): Promise<{ start: string; end: string }> {
    try {
      const config = await prisma.config.findFirst({
        where: { tenant_id: tenantId, key: 'shift_jam_pelajaran' },
      });

      if (config?.value) {
        const shiftConfig = JSON.parse(config.value);
        const assignedShiftId = shiftConfig.class_assignments?.[kelasId] || 'pagi';
        const shift = shiftConfig.shifts?.find((s: any) => s.id === assignedShiftId) || shiftConfig.shifts?.[0];

        const dayPattern = shift?.day_patterns?.[dayName] || shift?.slots;

        if (Array.isArray(dayPattern)) {
          const matchedSlot = dayPattern.find((sl: any) => Number(sl.slot || sl.slot_index) === slotIndex);
          if (matchedSlot?.start && matchedSlot?.end) {
            return { start: matchedSlot.start, end: matchedSlot.end };
          }
        }
      }
    } catch (err) {
      console.warn('[AscImporter] Failed to parse tenant shift_jam_pelajaran config, falling back to XML period times', err);
    }

    if (xmlPeriodTimes[slotIndex]) {
      return xmlPeriodTimes[slotIndex];
    }

    // Dynamic 45-minute fallback slot calculation per slotIndex
    const startTotalMin = 7 * 60 + slotIndex * 45;
    const endTotalMin = startTotalMin + 45;

    const startH = String(Math.floor(startTotalMin / 60)).padStart(2, '0');
    const startM = String(startTotalMin % 60).padStart(2, '0');
    const endH = String(Math.floor(endTotalMin / 60)).padStart(2, '0');
    const endM = String(endTotalMin % 60).padStart(2, '0');

    return { start: `${startH}:${startM}`, end: `${endH}:${endM}` };
  }

  static async analyzeAscXml(tenantId: string, xmlContent: string) {
    const timetable = this.parseXml(xmlContent);

    // 1. Fetch DB master entities
    const dbGurus = await prisma.guru.findMany({ where: { tenant_id: tenantId } });
    const dbClasses = await prisma.kelas.findMany({ where: { tenant_id: tenantId } });
    const dbSubjects = await prisma.mapel.findMany({ where: { tenant_id: tenantId } });

    // 2. Extract XML entities
    const xmlSubjectsRaw = timetable.subjects?.subject || [];
    const xmlSubjectsArr = Array.isArray(xmlSubjectsRaw) ? xmlSubjectsRaw : [xmlSubjectsRaw];

    const xmlTeachersRaw = timetable.teachers?.teacher || [];
    const xmlTeachersArr = Array.isArray(xmlTeachersRaw) ? xmlTeachersRaw : [xmlTeachersRaw];

    const xmlClassesRaw = timetable.classes?.class || [];
    const xmlClassesArr = Array.isArray(xmlClassesRaw) ? xmlClassesRaw : [xmlClassesRaw];

    const xmlLessonsRaw = timetable.lessons?.lesson || [];
    const xmlLessonsArr = Array.isArray(xmlLessonsRaw) ? xmlLessonsRaw : [xmlLessonsRaw];

    const xmlCardsRaw = timetable.cards?.card || [];
    const xmlCardsArr = Array.isArray(xmlCardsRaw) ? xmlCardsRaw : [xmlCardsRaw];

    // 3. Match Teachers
    const teacherAnalysis = xmlTeachersArr.map((t: any) => {
      const xmlId = String(t.id);
      const xmlName = String(t.name || t.lastname || t.firstname || '');
      const xmlCode = String(t.short || '');
      const normXmlName = this.normalizeName(xmlName);

      const exactMatch = dbGurus.find(
        (g: any) => this.normalizeName(g.nama_guru) === normXmlName || (g.asc_id && String(g.asc_id) === xmlId)
      );

      return {
        asc_id: xmlId,
        name: xmlName,
        code: xmlCode,
        matched_db_id: exactMatch?.id || null,
        matched_db_name: exactMatch?.nama_guru || null,
        match_status: exactMatch ? 'EXACT_MATCH' : 'NEW_CREATE',
      };
    });

    // 4. Match Classes
    const classAnalysis = xmlClassesArr.map((c: any) => {
      const xmlId = String(c.id);
      const xmlName = String(c.name || c.short || '');
      const xmlCode = String(c.short || '');
      const normXmlName = this.normalizeName(xmlName);

      const exactMatch = dbClasses.find(
        (k: any) => this.normalizeName(k.nama_kelas) === normXmlName || (k.asc_id && String(k.asc_id) === xmlId)
      );

      return {
        asc_id: xmlId,
        name: xmlName,
        code: xmlCode,
        matched_db_id: exactMatch?.id || null,
        matched_db_name: exactMatch?.nama_kelas || null,
        match_status: exactMatch ? 'EXACT_MATCH' : 'NEW_CREATE',
      };
    });

    // 5. Match Subjects
    const subjectAnalysis = xmlSubjectsArr.map((s: any) => {
      const xmlId = String(s.id);
      const xmlName = String(s.name || '');
      const xmlCode = String(s.short || '');
      const normXmlName = this.normalizeName(xmlName);

      const exactMatch = dbSubjects.find(
        (m: any) =>
          this.normalizeName(m.nama_mapel) === normXmlName ||
          (m.kode_mapel && this.normalizeName(m.kode_mapel) === this.normalizeName(xmlCode)) ||
          (m.asc_id && String(m.asc_id) === xmlId)
      );

      return {
        asc_id: xmlId,
        name: xmlName,
        code: xmlCode,
        matched_db_id: exactMatch?.id || null,
        matched_db_name: exactMatch?.nama_mapel || null,
        match_status: exactMatch ? 'EXACT_MATCH' : 'NEW_CREATE',
      };
    });

    return {
      summary: {
        total_teachers: xmlTeachersArr.length,
        total_classes: xmlClassesArr.length,
        total_subjects: xmlSubjectsArr.length,
        total_lessons: xmlLessonsArr.length,
        total_cards: xmlCardsArr.length,
      },
      teachers: teacherAnalysis,
      classes: classAnalysis,
      subjects: subjectAnalysis,
      db_teachers: dbGurus.map((g: any) => ({ id: g.id, name: g.nama_guru })),
      db_classes: dbClasses.map((c: any) => ({ id: c.id, name: c.nama_kelas })),
      db_subjects: dbSubjects.map((m: any) => ({ id: m.id, name: m.nama_mapel, code: m.kode_mapel })),
    };
  }

  static async executeAscImport(tenantId: string, input: ExecuteAscImportInput) {
    const timetable = this.parseXml(input.xml_content);
    const defaultHashedPassword = await bcrypt.hash('Absenta123!', 10);

    return await prisma.$transaction(
      async (tx: any) => {
      // Find or fallback Role GURU
      const guruRole = (await tx.role.findFirst({
        where: { name: 'GURU' },
      })) || (await tx.role.findFirst());

      if (!guruRole) {
        throw new Error('Role GURU tidak ditemukan di sistem.');
      }

      // 1. Resolve / Auto-Create Teachers Map
      const teacherIdMap = new Map<string, string>(); // asc_id -> db_id
      for (const tm of input.teacher_mappings) {
        if (tm.action === 'MATCH' && tm.target_id) {
          teacherIdMap.set(String(tm.asc_id), tm.target_id);
        } else if (tm.action === 'CREATE') {
          const existingGuru = await tx.guru.findFirst({
            where: { tenant_id: tenantId, nama_guru: tm.name },
          });

          if (existingGuru) {
            teacherIdMap.set(String(tm.asc_id), existingGuru.id);
          } else {
            const randomId = Math.floor(Math.random() * 1000000);
            const newUser = await tx.user.create({
              data: {
                tenant_id: tenantId,
                email: `guru_${tm.asc_id}_${randomId}@absenta.local`,
                password: defaultHashedPassword,
                full_name: tm.name,
                role_id: guruRole.id,
                status: 'ACTIVE',
              },
            });

            const createdGuru = await tx.guru.create({
              data: {
                tenant_id: tenantId,
                user_id: newUser.id,
                nama_guru: tm.name,
                asc_id: String(tm.asc_id),
              },
            });
            teacherIdMap.set(String(tm.asc_id), createdGuru.id);
          }
        }
      }

      // 2. Resolve / Auto-Create Classes Map
      const classIdMap = new Map<string, string>(); // asc_id -> db_id
      for (const cm of input.class_mappings) {
        if (cm.action === 'MATCH' && cm.target_id) {
          classIdMap.set(String(cm.asc_id), cm.target_id);
        } else if (cm.action === 'CREATE') {
          const existingKelas = await tx.kelas.findFirst({
            where: { tenant_id: tenantId, nama_kelas: cm.name },
          });

          if (existingKelas) {
            classIdMap.set(String(cm.asc_id), existingKelas.id);
          } else {
            const levelMatch = cm.name.match(/X|XI|XII|10|11|12/i);
            let tingkat = 10;
            if (levelMatch) {
              const str = levelMatch[0].toUpperCase();
              if (str === 'XI' || str === '11') tingkat = 11;
              if (str === 'XII' || str === '12') tingkat = 12;
            }
            const createdKelas = await tx.kelas.create({
              data: {
                tenant_id: tenantId,
                nama_kelas: cm.name,
                tingkat,
                asc_id: String(cm.asc_id),
              },
            });
            classIdMap.set(String(cm.asc_id), createdKelas.id);
          }
        }
      }

      // 3. Resolve / Auto-Create Subjects Map
      const subjectIdMap = new Map<string, string>(); // asc_id -> db_id
      for (const sm of input.subject_mappings) {
        if (sm.action === 'MATCH' && sm.target_id) {
          subjectIdMap.set(String(sm.asc_id), sm.target_id);
        } else if (sm.action === 'CREATE') {
          const existingMapel = await tx.mapel.findFirst({
            where: { tenant_id: tenantId, nama_mapel: sm.name },
          });

          if (existingMapel) {
            subjectIdMap.set(String(sm.asc_id), existingMapel.id);
          } else {
            const uniqueKode = `${(sm.code || sm.name.substring(0, 8)).replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'MAPEL'}_${sm.asc_id}`;
            const createdMapel = await tx.mapel.create({
              data: {
                tenant_id: tenantId,
                nama_mapel: sm.name,
                kode_mapel: uniqueKode,
                asc_id: String(sm.asc_id),
              },
            });
            subjectIdMap.set(String(sm.asc_id), createdMapel.id);
          }
        }
      }

      // 4. Overwrite Mode: Delete existing JadwalKBM & JadwalKontrakKbm for selected TP & Semester
      await tx.jadwalKBM.deleteMany({
        where: {
          tenant_id: tenantId,
          tahun_pelajaran_id: input.tahun_pelajaran_id,
          semester_id: input.semester_id,
        },
      });

      await tx.jadwalKontrakKbm.deleteMany({
        where: {
          tenant_id: tenantId,
          tahun_pelajaran_id: input.tahun_pelajaran_id,
          semester_id: input.semester_id,
        },
      });

      // 5. Extract & Import Lessons (JadwalKontrakKbm)
      const xmlLessonsRaw = timetable.lessons?.lesson || [];
      const xmlLessonsArr = Array.isArray(xmlLessonsRaw) ? xmlLessonsRaw : [xmlLessonsRaw];
      const lessonMetaMap = new Map<string, any>(); // asc_lesson_id -> lesson record
      const kontrakBatch: any[] = [];

      for (const les of xmlLessonsArr) {
        const ascLessonId = String(les.id);
        const classIdsArr = String(les.classids || '').split(',').map(s => s.trim()).filter(Boolean);
        const teacherIdsArr = String(les.teacherids || '').split(',').map(s => s.trim()).filter(Boolean);
        const subjectIdStr = String(les.subjectid || '').trim();

        const targetSubjectId = subjectIdMap.get(subjectIdStr) || null;
        const targetTeacherId = teacherIdsArr.map(tId => teacherIdMap.get(tId)).find(Boolean) || null;
        const targetClassIds = classIdsArr.map(cId => classIdMap.get(cId)).filter((cId): cId is string => Boolean(cId));

        if (targetClassIds.length === 0) continue;

        const periodsPerCard = Number(les.periodspercard) || 1;
        const periodsPerWeek = Number(les.periodsperweek) || periodsPerCard;
        const countCards = Math.ceil(periodsPerWeek / (periodsPerCard || 1));

        let blockRule = 'TUNGGAL';
        if (periodsPerCard === 2) blockRule = 'DOBEL';
        if (periodsPerCard === 3) blockRule = 'TIGA';
        if (periodsPerCard === 4) blockRule = 'EMPAT';
        if (periodsPerCard >= 5) blockRule = 'BLOK_PENUH';

        const isPembiasaan =
          subjectIdStr.toUpperCase().includes('PEMBIASAAN') ||
          subjectIdStr.toUpperCase().includes('UPACARA');

        for (const targetClassId of targetClassIds) {
          const kontrakId = crypto.randomUUID();
          kontrakBatch.push({
            id: kontrakId,
            tenant_id: tenantId,
            tahun_pelajaran_id: input.tahun_pelajaran_id,
            semester_id: input.semester_id,
            kelas_id: targetClassId,
            guru_id: targetTeacherId,
            mapel_id: targetSubjectId,
            jumlah_kartu: countCards,
            durasi_jp: periodsPerCard,
            total_jp: periodsPerWeek,
            aturan_blok: blockRule,
            is_pembiasaan: isPembiasaan,
            asc_lesson_id: ascLessonId,
          });
        }

        lessonMetaMap.set(ascLessonId, {
          classIds: targetClassIds,
          guruId: targetTeacherId,
          mapelId: targetSubjectId,
          isPembiasaan,
        });
      }

      if (kontrakBatch.length > 0) {
        await tx.jadwalKontrakKbm.createMany({
          data: kontrakBatch,
          skipDuplicates: true,
        });
      }

      // 6. Dynamically Extract Period Times & Daysdefs directly from XML
      const dynamicPeriodTimes = this.extractPeriodTimes(timetable);
      const dynamicDaysdefsMap = this.extractDaysdefs(timetable);

      const xmlCardsRaw = timetable.cards?.card || [];
      const xmlCardsArr = Array.isArray(xmlCardsRaw) ? xmlCardsRaw : [xmlCardsRaw];
      const cardsBatch: any[] = [];
      const usedClassSlots = new Set<string>();
      const usedGuruSlots = new Set<string>();

      for (const card of xmlCardsArr) {
        const ascLessonId = String(card.lessonid);
        const lessonMeta = lessonMetaMap.get(ascLessonId);
        if (!lessonMeta || !lessonMeta.classIds || lessonMeta.classIds.length === 0) continue;

        const periodIndex = Number(card.period) || 0;
        const daysInput = String(card.days || '');
        const targetDays = AscImporterService.resolveDaysFromXml(daysInput, dynamicDaysdefsMap);

        for (const dayName of targetDays) {
          for (const targetClassId of lessonMeta.classIds) {
            const slotTimes = await AscImporterService.resolveSlotTimesForDay(
              tenantId,
              targetClassId,
              dayName,
              periodIndex,
              dynamicPeriodTimes
            );

            const classKey = `${targetClassId}_${dayName}_${periodIndex}`;
            const guruKey = lessonMeta.guruId ? `${lessonMeta.guruId}_${dayName}_${periodIndex}` : null;

            if (usedClassSlots.has(classKey)) {
              continue;
            }
            if (guruKey && usedGuruSlots.has(guruKey)) {
              continue;
            }

            usedClassSlots.add(classKey);
            if (guruKey) usedGuruSlots.add(guruKey);

            cardsBatch.push({
              id: crypto.randomUUID(),
              tenant_id: tenantId,
              tahun_pelajaran_id: input.tahun_pelajaran_id,
              semester_id: input.semester_id,
              kelas_id: targetClassId,
              guru_id: lessonMeta.guruId,
              mapel_id: lessonMeta.mapelId,
              hari: dayName as any,
              slot_index: periodIndex,
              jam_mulai: slotTimes.start,
              jam_selesai: slotTimes.end,
              jenis_kegiatan: lessonMeta.isPembiasaan ? 'PEMBIASAAN' : 'KBM',
              asc_id: String(card.id || `${ascLessonId}-${dayName}-${periodIndex}`),
              created_by_user_id: input.user_id,
            });
          }
        }
      }

      if (cardsBatch.length > 0) {
        await tx.jadwalKBM.createMany({
          data: cardsBatch,
          skipDuplicates: true,
        });
      }

      // 7. Log Import Activity
      await tx.ascImportLog.create({
        data: {
          tenant_id: tenantId,
          tahun_pelajaran_id: input.tahun_pelajaran_id,
          semester_id: input.semester_id,
          nama_file: input.filename,
          total_guru_imported: teacherIdMap.size,
          total_kelas_imported: classIdMap.size,
          total_mapel_imported: subjectIdMap.size,
          total_kontrak: kontrakBatch.length,
          total_jadwal_cards: cardsBatch.length,
          status: 'SUCCESS',
          created_by_user_id: input.user_id,
        },
      });

      return {
        success: true,
        summary: {
          total_guru_matched: input.teacher_mappings.filter(t => t.action === 'MATCH').length,
          total_guru_created: input.teacher_mappings.filter(t => t.action === 'CREATE').length,
          total_guru_ignored: input.teacher_mappings.filter(t => t.action === 'IGNORE').length,
          total_guru: teacherIdMap.size,

          total_kelas_matched: input.class_mappings.filter(c => c.action === 'MATCH').length,
          total_kelas_created: input.class_mappings.filter(c => c.action === 'CREATE').length,
          total_kelas_ignored: input.class_mappings.filter(c => c.action === 'IGNORE').length,
          total_kelas: classIdMap.size,

          total_mapel_matched: input.subject_mappings.filter(s => s.action === 'MATCH').length,
          total_mapel_created: input.subject_mappings.filter(s => s.action === 'CREATE').length,
          total_mapel_ignored: input.subject_mappings.filter(s => s.action === 'IGNORE').length,
          total_mapel: subjectIdMap.size,

          total_kontrak: kontrakBatch.length,
          total_cards: cardsBatch.length,
        },
      };
    }, {
      timeout: 60000,
      maxWait: 10000,
    });
  }
}
