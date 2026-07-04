import { semesterService, CreateSemesterInput, UpdateSemesterInput } from '../services/semester.service';
import { createSemesterSchema, updateSemesterSchema } from '../services/semester.schema';

export class SemesterController {
  async getAllSemester(req: any, reply: any): Promise<void> {
    try {
      const user = req.user as any;

      const semester = await semesterService.getAllSemester(user.roleName, user.tenantId);

      reply.status(200).send({
        success: true,
        message: 'Semester retrieved successfully',
        data: semester,
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        message: 'Failed to retrieve semester',
        error: error.message,
      });
    }
  }

  async getSemesterById(req: any, reply: any): Promise<void> {
    try {
      const user = req.user as any;
      const { id } = req.params;

      const semester = await semesterService.getSemesterById(id, user.roleName, user.tenantId);

      if (!semester) {
        reply.status(404).send({
          success: false,
          message: 'Semester not found',
        });
        return;
      }

      reply.status(200).send({
        success: true,
        message: 'Semester retrieved successfully',
        data: semester,
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        message: 'Failed to retrieve semester',
        error: error.message,
      });
    }
  }

  async getSemesterByTahunPelajaran(req: any, reply: any): Promise<void> {
    try {
      const user = req.user as any;
      const { tahunPelajaranId } = req.params;

      const semesters = await semesterService.getSemesterByTahunPelajaran(tahunPelajaranId, user.roleName, user.tenantId);

      reply.status(200).send({
        success: true,
        message: 'Semesters retrieved successfully',
        data: semesters,
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        message: 'Failed to retrieve semesters',
        error: error.message,
      });
    }
  }

  async createSemester(req: any, reply: any): Promise<void> {
    try {
      const user = req.user as any;
      const parsedBody = createSemesterSchema.parse(req.body);

      const createSemesterInput: CreateSemesterInput = parsedBody;

      const semester = await semesterService.createSemester(
        createSemesterInput,
        user.tenantId
      );

      reply.status(201).send({
        success: true,
        message: 'Semester created successfully',
        data: semester,
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        message: 'Failed to create semester',
        error: error.message,
      });
    }
  }

  async updateSemester(req: any, reply: any): Promise<void> {
    try {
      const user = req.user as any;
      const { id } = req.params;
      const parsedBody = updateSemesterSchema.parse(req.body);

      const updateSemesterInput: UpdateSemesterInput = parsedBody;

      const semester = await semesterService.updateSemester(
        id,
        updateSemesterInput,
        user.roleName,
        user.tenantId
      );

      reply.status(200).send({
        success: true,
        message: 'Semester updated successfully',
        data: semester,
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        message: 'Failed to update semester',
        error: error.message,
      });
    }
  }

  async deleteSemester(req: any, reply: any): Promise<void> {
    try {
      const user = req.user as any;
      const { id } = req.params;

      await semesterService.deleteSemester(id, user.roleName, user.tenantId);

      reply.status(200).send({
        success: true,
        message: 'Semester deleted successfully',
      });
    } catch (error: any) {
      const msg = String(error?.message || '');
      if (
        msg.includes('not found') ||
        msg.includes('insufficient permissions') ||
        msg.includes('Tidak dapat menghapus') ||
        msg.includes('Cannot delete')
      ) {
        reply.status(400).send({
          success: false,
          message: msg,
        });
        return;
      }
      reply.status(500).send({
        success: false,
        message: 'Failed to delete semester',
        error: msg,
      });
    }
  }

  async getActiveSemester(req: any, reply: any): Promise<void> {
    try {
      const user = req.user as any;

      const semester = await semesterService.getActiveSemester(user.roleName, user.tenantId);

      reply.status(200).send({
        success: true,
        message: 'Active semester retrieved successfully',
        data: semester,
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        message: 'Failed to retrieve active semester',
        error: error.message,
      });
    }
  }

  async setActiveSemester(req: any, reply: any): Promise<void> {
    try {
      const user = req.user as any;
      const { id } = req.params;

      const semester = await semesterService.setActiveSemester(id, user.roleName, user.tenantId);

      reply.status(200).send({
        success: true,
        message: 'Active semester set successfully',
        data: semester,
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        message: 'Failed to set active semester',
        error: error.message,
      });
    }
  }
}

export const semesterController = new SemesterController();
