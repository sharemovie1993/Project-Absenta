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

const SLOT_TIME_MAP: Record<number, { start: string; end: string }> = {
  0: { start: '06:30', end: '07:00' },
  1: { start: '07:00', end: '07:45' },
  2: { start: '07:45', end: '08:30' },
  3: { start: '08:30', end: '09:15' },
  4: { start: '09:35', end: '10:20' },
  5: { start: '10:20', end: '11:05' },
  6: { start: '11:05', end: '11:50' },
  7: { start: '12:30', end: '13:15' },
  8: { start: '13:15', end: '14:00' },
  9: { start: '14:00', end: '14:45' },
  10: { start: '14:45', end: '15:30' },
  11: { start: '15:30', end: '16:15' },
  12: { start: '16:15', end: '17:00' },
};

const DAY_BITMASK_MAP: Record<string, string> = {
  '10000': 'SENIN',
  '01000': 'SELASA',
  '00100': 'RABU',
  '00010': 'KAMIS',
  '00001': 'JUMAT',
  '000001': 'SABTU',
};

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
            const tenantUser = await tx.user.findFirst({
              where: { tenant_id: tenantId },
            });
            if (tenantUser) {
              const createdGuru = await tx.guru.create({
                data: {
                  tenant_id: tenantId,
                  user_id: tenantUser.id,
                  nama_guru: tm.name,
                  asc_id: String(tm.asc_id),
                },
              });
              teacherIdMap.set(String(tm.asc_id), createdGuru.id);
            }
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
            const createdMapel = await tx.mapel.create({
              data: {
                tenant_id: tenantId,
                nama_mapel: sm.name,
                kode_mapel: sm.code || sm.name.substring(0, 10),
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

      // 6. Extract & Import Cards (JadwalKBM)
      const xmlDaysRaw = timetable.daysdefs?.daysdef || [];
      const xmlDaysArr = Array.isArray(xmlDaysRaw) ? xmlDaysRaw : [xmlDaysRaw];
      const daysdefMap = new Map<string, string>(); // daysdef_id -> DAY_NAME
      xmlDaysArr.forEach((d: any) => {
        const dId = String(d.id);
        const dBit = String(d.days || '');
        const dName = String(d.name || '').toUpperCase();
        if (dName.includes('SENIN')) daysdefMap.set(dId, 'SENIN');
        else if (dName.includes('SELASA')) daysdefMap.set(dId, 'SELASA');
        else if (dName.includes('RABU')) daysdefMap.set(dId, 'RABU');
        else if (dName.includes('KAMIS')) daysdefMap.set(dId, 'KAMIS');
        else if (dName.includes('JUMAT')) daysdefMap.set(dId, 'JUMAT');
        else if (dName.includes('SABTU')) daysdefMap.set(dId, 'SABTU');
        else if (DAY_BITMASK_MAP[dBit]) daysdefMap.set(dId, DAY_BITMASK_MAP[dBit]);
      });

      const xmlCardsRaw = timetable.cards?.card || [];
      const xmlCardsArr = Array.isArray(xmlCardsRaw) ? xmlCardsRaw : [xmlCardsRaw];

      let totalCardsCreated = 0;
      for (const card of xmlCardsArr) {
        const ascLessonId = String(card.lessonid);
        const lessonMeta = lessonMetaMap.get(ascLessonId);
        if (!lessonMeta) continue;

        const periodIndex = Number(card.period) || 0;
        const daysdefId = String(card.days || '');
        let dayName = daysdefMap.get(daysdefId) || 'SENIN';

        if (daysdefId.length === 5) {
          if (daysdefId === '10000') dayName = 'SENIN';
          else if (daysdefId === '01000') dayName = 'SELASA';
          else if (daysdefId === '00100') dayName = 'RABU';
          else if (daysdefId === '00010') dayName = 'KAMIS';
          else if (daysdefId === '00001') dayName = 'JUMAT';
        }

        const slotTimes = SLOT_TIME_MAP[periodIndex] || { start: '07:00', end: '07:45' };

        try {
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
          totalCardsCreated++;
        } catch (e) {
          console.warn(`[AscImporter] Duplicate slot collision ignored for class ${lessonMeta.kelasId} ${dayName} slot ${periodIndex}`);
        }
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
