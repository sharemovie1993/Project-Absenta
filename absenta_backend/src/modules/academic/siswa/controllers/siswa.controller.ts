import { siswaCrudController } from './sub/siswa-crud.controller';
import { siswaProfileController } from './sub/siswa-profile.controller';
import { siswaToolsController } from './sub/siswa-tools.controller';
import { siswaExcelController } from './sub/siswa-excel.controller';
import { siswaDocumentsController } from './sub/siswa-documents.controller';

export const siswaController = {
  ...siswaCrudController,
  ...siswaProfileController,
  ...siswaToolsController,
  ...siswaExcelController,
  ...siswaDocumentsController
};
