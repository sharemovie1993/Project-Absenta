import { UploadService } from '../services/upload.service';

const uploadService = new UploadService();

export const uploadController = {
  async uploadFile(request: any, reply: any) {
    try {
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ success: false, message: 'No file uploaded' });
      }

      // Optional: Validate mime type
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/x-icon', 'image/svg+xml'];
      if (!allowedMimeTypes.includes(data.mimetype)) {
         return reply.status(400).send({ success: false, message: 'Invalid file type. Only images are allowed.' });
      }

      const fileUrl = await uploadService.saveFile(data);

      return reply.send({
        success: true,
        message: 'File uploaded successfully',
        data: {
          url: fileUrl,
          filename: data.filename,
          mimetype: data.mimetype
        }
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ success: false, message: 'Upload failed', error: error.message });
    }
  }
};
