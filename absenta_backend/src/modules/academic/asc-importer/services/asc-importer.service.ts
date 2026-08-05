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
      parseAttributeValue: false, // Crucial: Keep raw attribute strings (e.g. bitmasks "01000", "00001", IDs)
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
   * Helper to match day name string in English or Indonesian
   */
  static getDayFromText(text: string): string | null {
    const t = text.toUpperCase();
    if (t.includes('SEN') || t.includes('MON') || t === 'MO') return 'SENIN';
    if (t.includes('SEL') || t.includes('TUE') || t === 'TU') return 'SELASA';
    if (t.includes('RAB') || t.includes('WED') || t === 'WE') return 'RABU';
    if (t.includes('KAM') || t.includes('THU') || t === 'TH') return 'KAMIS';
    if (t.includes('JUM') || t.includes('FRI') || t === 'FR') return 'JUMAT';
    if (t.includes('SAB') || t.includes('SAT') || t === 'SA') return 'SABTU';
    if (t.includes('MIN') || t.includes('SUN') || t === 'SU') return 'MINGGU';
    return null;
  }

  /**
   * Resolve list of days from daysdefId or days bitmask string (e.g. 10000 -> SENIN, 01000 -> SELASA, 00001 -> JUMAT, 11111 -> SENIN..JUMAT)
   */
  static resolveDaysFromXml(daysInput: string, daysdefsMap: Map<string, { bitmask: string; name: string }>): string[] {
    const rawInput = String(daysInput || '').trim();
    if (!rawInput) return ['SENIN'];

    const foundDef = daysdefsMap.get(rawInput);
    const dayNames = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'];

    // 1. Check foundDef name first if it contains explicit day names
    const defName = foundDef?.name || '';
    if (defName) {
      const explicitDays: string[] = [];
      if (/SENIN|MON/i.test(defName)) explicitDays.push('SENIN');
      if (/SELASA|TUE/i.test(defName)) explicitDays.push('SELASA');
      if (/RABU|WED/i.test(defName)) explicitDays.push('RABU');
      if (/KAMIS|THU/i.test(defName)) explicitDays.push('KAMIS');
      if (/JUMAT|FRI/i.test(defName)) explicitDays.push('JUMAT');
      if (/SABTU|SAT/i.test(defName)) explicitDays.push('SABTU');
      if (/MINGGU|SUN/i.test(defName)) explicitDays.push('MINGGU');

      if (explicitDays.length > 0) {
        return explicitDays;
      }
    }

    // 2. Check Bitmask string from foundDef or rawInput directly
    let bitmask = (foundDef?.bitmask || rawInput).trim();

    // If bitmask is binary string (contains only 0 and 1)
    if (/^[01]+$/.test(bitmask)) {
      // Pad with leading zeros if fast-xml-parser or XML stripped leading 0 (e.g. "1000" -> "01000")
      if (bitmask.length < 5) {
        bitmask = bitmask.padStart(5, '0');
      }

      const resolvedDays: string[] = [];
      for (let i = 0; i < bitmask.length; i++) {
        if (bitmask[i] === '1' && dayNames[i]) {
          resolvedDays.push(dayNames[i]);
        }
      }
      if (resolvedDays.length > 0) {
        return resolvedDays;
      }
    }

    // 3. Check 1-based day index number (1 = Senin, 2 = Selasa, 3 = Rabu, 4 = Kamis, 5 = Jumat, 6 = Sabtu)
    const numInput = Number(rawInput);
    if (!isNaN(numInput) && numInput >= 1 && numInput <= 7) {
      return [dayNames[numInput - 1]];
    }

    // 4. Fallback direct text check
    const directDayFromText = AscImporterService.getDayFromText(rawInput);
    if (directDayFromText) return [directDayFromText];

    return ['SENIN'];
  }

  /**
   * Smart Day-Pattern Slot Resolver:
   * 1. Checks DB Tenant 'shift_jam_pelajaran' config for day-specific bell schedule
   * 2. Fallback to XML <periods> starttime & endtime (using original XML period number)
   * 3. Fallback to 45-min time calculation (guarantees NO card dropped)
   */
  static async resolveSlotTimesForDay(
    tenantId: string,
    kelasId: string,
    dayName: string,
    absSlotIndex: number,     // Absenta slot index (JAM 1-based)
    xmlPeriodNum: number,     // Original XML period number
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

        if (Array.isArray(dayPattern) && dayPattern.length > 0) {
          const matchedSlot = dayPattern.find((sl: any) => Number(sl.slot || sl.slot_index) === absSlotIndex);
          if (matchedSlot?.start && matchedSlot?.end) {
            return { start: matchedSlot.start, end: matchedSlot.end };
          }
        }
      }
    } catch (err) {
      console.warn('[AscImporter] Failed to parse tenant shift_jam_pelajaran config', err);
    }

    // Fallback to XML <periods> starttime & endtime using original XML period number
    if (xmlPeriodTimes[xmlPeriodNum]) {
      return xmlPeriodTimes[xmlPeriodNum];
    }
    if (xmlPeriodTimes[absSlotIndex]) {
      return xmlPeriodTimes[absSlotIndex];
    }

    // Dynamic 45-minute fallback slot calculation per slotIndex if missing from DB and XML
    const startTotalMin = 7 * 60 + 15 + (absSlotIndex - 1) * 45;
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
    const dbClasses = await prisma.kelas.findMany({ where: { tenant_id: tenantId }, include: { Jurusan: true } });
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

      const activeClasses = dbClasses.filter((k: any) => k.is_active !== false);
      const exactMatch = activeClasses.find(
        (k: any) => this.normalizeName(k.nama_kelas) === normXmlName || (k.asc_id && String(k.asc_id) === xmlId)
      ) || dbClasses.find(
        (k: any) => this.normalizeName(k.nama_kelas) === normXmlName || (k.asc_id && String(k.asc_id) === xmlId)
      );

      const matchedNameWithJurusan = exactMatch
        ? `${exactMatch.nama_kelas}${exactMatch.Jurusan ? ` - ${exactMatch.Jurusan.singkatan || exactMatch.Jurusan.nama}` : ''}`
        : null;

      return {
        asc_id: xmlId,
        name: xmlName,
        code: xmlCode,
        matched_db_id: exactMatch?.id || null,
        matched_db_name: matchedNameWithJurusan || exactMatch?.nama_kelas || null,
        match_status: exactMatch ? 'EXACT_MATCH' : 'NEW_CREATE',
      };
    });

    // Natural sort class list so X TE 3 appears between X TE 2 and X TE 4
    classAnalysis.sort((a: any, b: any) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );

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
      db_classes: dbClasses.map((c: any) => ({
        id: c.id,
        name: `${c.nama_kelas}${c.Jurusan ? ` (${c.Jurusan.singkatan || c.Jurusan.nama})` : ''}${c.is_active === false ? ' [NONAKTIF]' : ''}`,
      })),
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
      const xmlSubjectsRaw = timetable.subjects?.subject || [];
      const xmlSubjectsArr = Array.isArray(xmlSubjectsRaw) ? xmlSubjectsRaw : [xmlSubjectsRaw];
      const xmlLessonsRaw = timetable.lessons?.lesson || [];
      const xmlLessonsArr = Array.isArray(xmlLessonsRaw) ? xmlLessonsRaw : [xmlLessonsRaw];
      const lessonMetaMap = new Map<string, any>(); // asc_lesson_id -> lesson record
      const kontrakBatch: any[] = [];

      for (const les of xmlLessonsArr) {
        const ascLessonId = String(les.id);
        const classIdsArr = String(les.classids || '').split(',').map(s => s.trim()).filter(Boolean);
        const teacherIdsArr = String(les.teacherids || '').split(',').map(s => s.trim()).filter(Boolean);
        const subjectIdStr = String(les.subjectid || '').trim();

        let targetSubjectId = subjectIdMap.get(subjectIdStr) || null;
        if (!targetSubjectId && subjectIdStr) {
          const xmlSub = xmlSubjectsArr.find((s: any) => String(s.id) === subjectIdStr);
          if (xmlSub) {
            const subName = String(xmlSub.name || xmlSub.short || 'Mata Pelajaran').trim();
            const existingMapel = await tx.mapel.findFirst({
              where: { tenant_id: tenantId, nama_mapel: { equals: subName, mode: 'insensitive' } },
            });
            if (existingMapel) {
              targetSubjectId = existingMapel.id;
            } else {
              const uniqueKode = `${(xmlSub.short || subName.substring(0, 8)).replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'MAPEL'}_${subjectIdStr}`;
              const newSub = await tx.mapel.create({
                data: {
                  tenant_id: tenantId,
                  nama_mapel: subName,
                  kode_mapel: uniqueKode,
                  asc_id: subjectIdStr,
                },
              });
              targetSubjectId = newSub.id;
            }
            if (targetSubjectId) {
              subjectIdMap.set(subjectIdStr, targetSubjectId);
            }
          }
        }

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
          periodsPerCard,
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

      // Count how many <card> entries exist in XML for each lessonid
      const cardCountPerLesson = new Map<string, number>();
      for (const card of xmlCardsArr) {
        const lesId = String(card.lessonid);
        cardCountPerLesson.set(lesId, (cardCountPerLesson.get(lesId) || 0) + 1);
      }

      // XML aSc TimeTables uses 1-based period numbering:
      //   period 1 = JAM 0 (Pembiasaan: Upacara, Apel Datang, dll.)
      //   period 2 = JAM 1 (KBM pertama)
      //   period 3 = JAM 2 ... dst.
      // Absenta slot_index is 0-based (JAM 0, JAM 1, JAM 2, ...).
      // Simple constant offset: slot_index = xmlPeriod - 1
      const PERIOD_OFFSET = 1;
      console.log(`[AscImporter] Using fixed period offset: XML period N -> slot_index N-${PERIOD_OFFSET} (period 1=JAM 0, period 2=JAM 1, ...)`);

      for (const card of xmlCardsArr) {
        const ascLessonId = String(card.lessonid);
        const lessonMeta = lessonMetaMap.get(ascLessonId);
        if (!lessonMeta || !lessonMeta.classIds || lessonMeta.classIds.length === 0) continue;

        const xmlBasePeriod = Number(card.period) || 1; // original XML period (for time lookup)
        const absBasePeriod = Math.max(0, xmlBasePeriod - PERIOD_OFFSET); // Absenta slot_index (JAM 0-based)

        // If XML exports individual <card> elements for each 1-JP slot of a lesson (cardCount > 1 or cardCount >= periodsPerWeek),
        // each <card> element is already 1 period. Otherwise, if XML exports 1 block <card> element, expand by periodsPerCard.
        const totalCardsForThisLesson = cardCountPerLesson.get(ascLessonId) || 1;
        const durasiJp = (totalCardsForThisLesson > 1 || totalCardsForThisLesson >= (lessonMeta.periodsPerWeek || 1))
          ? 1
          : (Number(lessonMeta.periodsPerCard) || 1);

        const daysInput = String(card.days || '');
        const targetDays = AscImporterService.resolveDaysFromXml(daysInput, dynamicDaysdefsMap);

        for (const dayName of targetDays) {
          for (const targetClassId of lessonMeta.classIds) {
            for (let pOffset = 0; pOffset < durasiJp; pOffset++) {
              const absSlotIdx = absBasePeriod + pOffset;    // Absenta JAM index (stored as slot_index)
              const xmlPeriodNum = xmlBasePeriod + pOffset;  // XML period number (for time lookup)

              // JAM 0 dikelola oleh sistem Jadwal Kegiatan Absenta (Upacara, Apel, dll.)
              // Pembiasaan juga dikelola terpisah. Keduanya TIDAK diimpor dari XML.
              if (absSlotIdx === 0 || lessonMeta.isPembiasaan) {
                continue;
              }

              const slotTimes = await AscImporterService.resolveSlotTimesForDay(
                tenantId,
                targetClassId,
                dayName,
                absSlotIdx,
                xmlPeriodNum,
                dynamicPeriodTimes
              );

              // Skip slot if no period time found — NO fallback generation
              if (!slotTimes) {
                console.warn(`[AscImporter] Skipping slot: no time found for XML period ${xmlPeriodNum} (abs JAM ${absSlotIdx}), day ${dayName}, class ${targetClassId}`);
                continue;
              }

              const classKey = `${targetClassId}_${dayName}_${absSlotIdx}`;
              const guruKey = lessonMeta.guruId ? `${lessonMeta.guruId}_${dayName}_${absSlotIdx}` : null;

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
                slot_index: absSlotIdx,
                jam_mulai: slotTimes.start,
                jam_selesai: slotTimes.end,
                jenis_kegiatan: lessonMeta.isPembiasaan ? 'PEMBIASAAN' : 'KBM',
                asc_id: String(card.id || `${ascLessonId}-${dayName}-${absSlotIdx}`),
                created_by_user_id: input.user_id,
              });
            }
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
