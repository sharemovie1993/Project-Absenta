import { XMLParser } from 'fast-xml-parser';
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

        if (start && end) {
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
  static extractDaysdefs(timetable: any): Map<string, string> {
    const daysMap = new Map<string, string>();
    const rawDays = timetable.daysdefs?.daysdef || [];
    const daysArr = Array.isArray(rawDays) ? rawDays : [rawDays];

    daysArr.forEach((d: any) => {
      const dId = String(d.id);
      const dName = String(d.name || d.short || '').toUpperCase();
      const dBit = String(d.days || '');

      if (dName.includes('SENIN') || dBit === '10000') daysMap.set(dId, 'SENIN');
      else if (dName.includes('SELASA') || dBit === '01000') daysMap.set(dId, 'SELASA');
      else if (dName.includes('RABU') || dBit === '00100') daysMap.set(dId, 'RABU');
      else if (dName.includes('KAMIS') || dBit === '00010') daysMap.set(dId, 'KAMIS');
      else if (dName.includes('JUMAT') || dBit === '00001') daysMap.set(dId, 'JUMAT');
      else if (dName.includes('SABTU') || dBit === '000001') daysMap.set(dId, 'SABTU');
    });

    return daysMap;
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

    return { start: '07:00', end: '07:45' };
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

    return await prisma.$transaction(async (tx: any) => {
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
                username: `guru_${tm.asc_id}_${randomId}`,
                email: `guru_${tm.asc_id}_${randomId}@absenta.local`,
                nama_lengkap: tm.name,
                role_name: 'GURU',
                is_active: true,
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

      let totalKontrakCreated = 0;
      for (const les of xmlLessonsArr) {
        const ascLessonId = String(les.id);
        const classIdsStr = String(les.classids || '');
        const subjectIdStr = String(les.subjectid || '');
        const teacherIdsStr = String(les.teacherids || '');

        const targetClassId = classIdMap.get(classIdsStr) || null;
        const targetSubjectId = subjectIdMap.get(subjectIdStr) || null;
        const targetTeacherId = teacherIdMap.get(teacherIdsStr) || null;

        if (!targetClassId) continue;

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

        const kontrakRecord = await tx.jadwalKontrakKbm.create({
          data: {
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
          },
        });

        totalKontrakCreated++;
        lessonMetaMap.set(ascLessonId, {
          kontrakId: kontrakRecord.id,
          kelasId: targetClassId,
          guruId: targetTeacherId,
          mapelId: targetSubjectId,
          isPembiasaan,
        });
      }

      // 6. Dynamically Extract Period Times & Daysdefs directly from XML
      const dynamicPeriodTimes = this.extractPeriodTimes(timetable);
      const dynamicDaysdefsMap = this.extractDaysdefs(timetable);

      const xmlCardsRaw = timetable.cards?.card || [];
      const xmlCardsArr = Array.isArray(xmlCardsRaw) ? xmlCardsRaw : [xmlCardsRaw];

      let totalCardsCreated = 0;
      for (const card of xmlCardsArr) {
        const ascLessonId = String(card.lessonid);
        const lessonMeta = lessonMetaMap.get(ascLessonId);
        if (!lessonMeta) continue;

        const periodIndex = Number(card.period) || 0;
        const daysdefId = String(card.days || '');
        let dayName = dynamicDaysdefsMap.get(daysdefId);

        if (!dayName && daysdefId.length === 5) {
          if (daysdefId === '10000') dayName = 'SENIN';
          else if (daysdefId === '01000') dayName = 'SELASA';
          else if (daysdefId === '00100') dayName = 'RABU';
          else if (daysdefId === '00010') dayName = 'KAMIS';
          else if (daysdefId === '00001') dayName = 'JUMAT';
        }
        if (!dayName) dayName = 'SENIN';

        const slotTimes = await AscImporterService.resolveSlotTimesForDay(
          tenantId,
          lessonMeta.kelasId,
          dayName,
          periodIndex,
          dynamicPeriodTimes
        );

        const existingCard = await tx.jadwalKBM.findFirst({
          where: {
            tenant_id: tenantId,
            tahun_pelajaran_id: input.tahun_pelajaran_id,
            semester_id: input.semester_id,
            kelas_id: lessonMeta.kelasId,
            hari: dayName as any,
            slot_index: periodIndex,
          },
        });

        if (existingCard) {
          await tx.jadwalKBM.update({
            where: { id: existingCard.id },
            data: {
              guru_id: lessonMeta.guruId,
              mapel_id: lessonMeta.mapelId,
              jam_mulai: slotTimes.start,
              jam_selesai: slotTimes.end,
              jenis_kegiatan: lessonMeta.isPembiasaan ? 'PEMBIASAAN' : 'KBM',
              asc_id: String(card.id || `${ascLessonId}-${periodIndex}`),
            },
          });
        } else {
          await tx.jadwalKBM.create({
            data: {
              tenant_id: tenantId,
              tahun_pelajaran_id: input.tahun_pelajaran_id,
              semester_id: input.semester_id,
              kelas_id: lessonMeta.kelasId,
              guru_id: lessonMeta.guruId,
              mapel_id: lessonMeta.mapelId,
              hari: dayName as any,
              slot_index: periodIndex,
              jam_mulai: slotTimes.start,
              jam_selesai: slotTimes.end,
              jenis_kegiatan: lessonMeta.isPembiasaan ? 'PEMBIASAAN' : 'KBM',
              asc_id: String(card.id || `${ascLessonId}-${periodIndex}`),
              created_by_user_id: input.user_id,
            },
          });
        }
        totalCardsCreated++;
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
          total_kontrak: totalKontrakCreated,
          total_jadwal_cards: totalCardsCreated,
          status: 'SUCCESS',
          created_by_user_id: input.user_id,
        },
      });

      return {
        success: true,
        summary: {
          total_guru: teacherIdMap.size,
          total_kelas: classIdMap.size,
          total_mapel: subjectIdMap.size,
          total_kontrak: totalKontrakCreated,
          total_cards: totalCardsCreated,
        },
      };
    });
  }
}
