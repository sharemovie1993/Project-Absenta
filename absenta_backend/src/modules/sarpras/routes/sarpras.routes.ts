import { AssetController } from '../controllers/asset.controller';
import { LoanController } from '../controllers/loan.controller';
import { RepairController } from '../controllers/repair.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { organizationalScopeMiddleware } from '@/middlewares/organizationalScope';
import { determineDataScope } from '@/middlewares/dataScope';

export async function sarprasRoutes(fastify: any) {
  const assetController = new AssetController();
  const loanController = new LoanController();
  const repairController = new RepairController();

  // --- Categories ---
  fastify.get('/categories', {
    preHandler: [requireCapability('sarpras.inventory.view.list'), organizationalScopeMiddleware, determineDataScope()]
  }, assetController.getCategories.bind(assetController));

  fastify.post('/categories', {
    preHandler: [requireCapability('sarpras.categories.manage'), organizationalScopeMiddleware, determineDataScope()]
  }, assetController.createCategory.bind(assetController));

  // --- Locations ---
  fastify.get('/locations', {
    preHandler: [requireCapability('sarpras.inventory.view.list'), organizationalScopeMiddleware, determineDataScope()]
  }, assetController.getLocations.bind(assetController));

  fastify.post('/locations', {
    preHandler: [requireCapability('sarpras.locations.manage'), organizationalScopeMiddleware, determineDataScope()]
  }, assetController.createLocation.bind(assetController));

  // --- Assets ---
  fastify.get('/assets', {
    preHandler: [requireCapability(['sarpras.inventory.view.list', 'sarpras.loans.request']), organizationalScopeMiddleware, determineDataScope()]
  }, assetController.getAssets.bind(assetController));

  fastify.get('/assets/:id', {
    preHandler: [requireCapability('sarpras.inventory.view.list'), organizationalScopeMiddleware, determineDataScope()]
  }, assetController.getAssetById.bind(assetController));

  fastify.post('/assets', {
    preHandler: [requireCapability('sarpras.inventory.manage'), organizationalScopeMiddleware, determineDataScope()]
  }, assetController.createAsset.bind(assetController));

  fastify.get('/assets/:id/qrcode', {
    preHandler: [requireCapability('sarpras.inventory.view.list'), organizationalScopeMiddleware, determineDataScope()]
  }, assetController.printQrCodes.bind(assetController));

  fastify.post('/assets/qrcode', {
    preHandler: [requireCapability('sarpras.inventory.view.list'), organizationalScopeMiddleware, determineDataScope()]
  }, assetController.printQrCodes.bind(assetController));

  fastify.put('/assets/:id', {
    preHandler: [requireCapability('sarpras.inventory.manage'), organizationalScopeMiddleware, determineDataScope()]
  }, assetController.updateAsset.bind(assetController));

  fastify.delete('/assets/:id', {
    preHandler: [requireCapability('sarpras.inventory.manage'), organizationalScopeMiddleware, determineDataScope()]
  }, assetController.deleteAsset.bind(assetController));

  fastify.post('/assets/import', {
    preHandler: [requireCapability('sarpras.inventory.manage'), organizationalScopeMiddleware, determineDataScope()]
  }, assetController.importAssets.bind(assetController));

  fastify.get('/assets/stats', {
    preHandler: [requireCapability('sarpras.inventory.view.list'), organizationalScopeMiddleware, determineDataScope()]
  }, assetController.getStats.bind(assetController));

  fastify.get('/assets/import/template', {
    preHandler: [requireCapability('sarpras.inventory.manage'), determineDataScope()]
  }, assetController.getImportTemplate.bind(assetController));

  const requireGlobalCatalogManage = async (request: any, reply: any) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Unauthorized' });
    }
    const roleName = user.roleName || user.Role?.name || user.role?.name;
    if (roleName === 'SUPERADMIN' || roleName === 'ADMIN') {
      return;
    }
    return reply.status(403).send({ code: 'FORBIDDEN', message: 'Akses ditolak: Hanya untuk Owner dan Superadmin' });
  };

  fastify.get('/catalog', {
    preHandler: [requireCapability('sarpras.inventory.view.list'), determineDataScope()]
  }, assetController.getCatalog.bind(assetController));

  fastify.post('/catalog', {
    preHandler: [requireGlobalCatalogManage, determineDataScope()]
  }, assetController.createCatalogItem.bind(assetController));

  fastify.put('/catalog/:id', {
    preHandler: [requireGlobalCatalogManage, determineDataScope()]
  }, assetController.updateCatalogItem.bind(assetController));

  fastify.delete('/catalog/:id', {
    preHandler: [requireGlobalCatalogManage, determineDataScope()]
  }, assetController.deleteCatalogItem.bind(assetController));

  // --- Consumables & Depreciation Reports ---
  fastify.get('/assets/reports/depreciation', {
    preHandler: [requireCapability('sarpras.inventory.view.list'), organizationalScopeMiddleware, determineDataScope()]
  }, assetController.getDepreciationReport.bind(assetController));

  fastify.get('/assets/consumables', {
    preHandler: [requireCapability('sarpras.inventory.view.list'), organizationalScopeMiddleware, determineDataScope()]
  }, assetController.getConsumables.bind(assetController));

  fastify.put('/assets/consumables/:id/threshold', {
    preHandler: [requireCapability('sarpras.inventory.manage'), organizationalScopeMiddleware, determineDataScope()]
  }, assetController.updateConsumableThreshold.bind(assetController));

  fastify.post('/assets/consumables/:id/consume', {
    preHandler: [requireCapability('sarpras.inventory.manage'), organizationalScopeMiddleware, determineDataScope()]
  }, assetController.consumeAsset.bind(assetController));

  // --- Real-time Dashboard ---
  fastify.get('/assets/dashboard/realtime', {
    preHandler: [requireCapability('sarpras.inventory.view.list'), organizationalScopeMiddleware, determineDataScope()]
  }, assetController.getRealtimeStats.bind(assetController));

  fastify.get('/assets/scan/:code', {
    preHandler: [requireCapability('sarpras.inventory.view.list'), organizationalScopeMiddleware, determineDataScope()]
  }, assetController.scanAsset.bind(assetController));

  fastify.post('/assets/opname', {
    preHandler: [requireCapability('sarpras.inventory.manage'), organizationalScopeMiddleware, determineDataScope()]
  }, assetController.runStockOpname.bind(assetController));

  // --- Loans ---
  fastify.get('/loans', {
    preHandler: [requireCapability('sarpras.loans.view.list'), organizationalScopeMiddleware, determineDataScope()]
  }, loanController.getLoans.bind(loanController));

  fastify.post('/loans', {
    preHandler: [requireCapability('sarpras.loans.request'), organizationalScopeMiddleware, determineDataScope()]
  }, loanController.requestLoan.bind(loanController));

  fastify.put('/loans/:id/status', {
    preHandler: [requireCapability('sarpras.loans.manage'), organizationalScopeMiddleware, determineDataScope()]
  }, loanController.updateStatus.bind(loanController));

  fastify.get('/scanner/user', {
    preHandler: [requireCapability('sarpras.loans.request'), determineDataScope()]
  }, loanController.scanUser.bind(loanController));

  // --- Repairs / Maintenance ---
  fastify.get('/repairs', {
    preHandler: [requireCapability('sarpras.repairs.view.list'), organizationalScopeMiddleware, determineDataScope()]
  }, repairController.getRepairs.bind(repairController));

  fastify.get('/repairs/stats', {
    preHandler: [requireCapability('sarpras.repairs.view.list'), organizationalScopeMiddleware, determineDataScope()]
  }, repairController.getRepairStats.bind(repairController));

  fastify.post('/repairs', {
    preHandler: [requireCapability('sarpras.repairs.manage'), organizationalScopeMiddleware, determineDataScope()]
  }, repairController.createRepair.bind(repairController));

  fastify.put('/repairs/:id', {
    preHandler: [requireCapability('sarpras.repairs.manage'), organizationalScopeMiddleware, determineDataScope()]
  }, repairController.updateRepair.bind(repairController));

  fastify.get('/repairs/calendar', {
    preHandler: [requireCapability('sarpras.repairs.view.list'), organizationalScopeMiddleware, determineDataScope()]
  }, repairController.getRepairsCalendar.bind(repairController));
}
