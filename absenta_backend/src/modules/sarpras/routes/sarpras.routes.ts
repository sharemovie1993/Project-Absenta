import { AssetController } from '../controllers/asset.controller';
import { LoanController } from '../controllers/loan.controller';
import { RepairController } from '../controllers/repair.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { organizationalScopeMiddleware } from '@/middlewares/organizationalScope';

export async function sarprasRoutes(fastify: any) {
  const assetController = new AssetController();
  const loanController = new LoanController();
  const repairController = new RepairController();

  // --- Categories ---
  fastify.get('/categories', {
    preHandler: [requireCapability('sarpras.inventory.view.list'), organizationalScopeMiddleware]
  }, assetController.getCategories.bind(assetController));

  fastify.post('/categories', {
    preHandler: [requireCapability('sarpras.categories.manage'), organizationalScopeMiddleware]
  }, assetController.createCategory.bind(assetController));

  // --- Locations ---
  fastify.get('/locations', {
    preHandler: [requireCapability('sarpras.inventory.view.list'), organizationalScopeMiddleware]
  }, assetController.getLocations.bind(assetController));

  fastify.post('/locations', {
    preHandler: [requireCapability('sarpras.locations.manage'), organizationalScopeMiddleware]
  }, assetController.createLocation.bind(assetController));

  // --- Assets ---
  fastify.get('/assets', {
    preHandler: [requireCapability(['sarpras.inventory.view.list', 'sarpras.loans.request']), organizationalScopeMiddleware]
  }, assetController.getAssets.bind(assetController));

  fastify.get('/assets/:id', {
    preHandler: [requireCapability('sarpras.inventory.view.list'), organizationalScopeMiddleware]
  }, assetController.getAssetById.bind(assetController));

  fastify.post('/assets', {
    preHandler: [requireCapability('sarpras.inventory.manage'), organizationalScopeMiddleware]
  }, assetController.createAsset.bind(assetController));

  fastify.get('/assets/:id/qrcode', {
    preHandler: [requireCapability('sarpras.inventory.view.list'), organizationalScopeMiddleware]
  }, assetController.printQrCodes.bind(assetController));

  fastify.post('/assets/qrcode', {
    preHandler: [requireCapability('sarpras.inventory.view.list'), organizationalScopeMiddleware]
  }, assetController.printQrCodes.bind(assetController));

  fastify.put('/assets/:id', {
    preHandler: [requireCapability('sarpras.inventory.manage'), organizationalScopeMiddleware]
  }, assetController.updateAsset.bind(assetController));

  fastify.delete('/assets/:id', {
    preHandler: [requireCapability('sarpras.inventory.manage'), organizationalScopeMiddleware]
  }, assetController.deleteAsset.bind(assetController));

  fastify.post('/assets/import', {
    preHandler: [requireCapability('sarpras.inventory.manage'), organizationalScopeMiddleware]
  }, assetController.importAssets.bind(assetController));

  fastify.get('/assets/stats', {
    preHandler: [requireCapability('sarpras.inventory.view.list'), organizationalScopeMiddleware]
  }, assetController.getStats.bind(assetController));

  fastify.get('/assets/import/template', {
    preHandler: [requireCapability('sarpras.inventory.manage')]
  }, assetController.getImportTemplate.bind(assetController));

  // --- Consumables & Depreciation Reports ---
  fastify.get('/assets/reports/depreciation', {
    preHandler: [requireCapability('sarpras.inventory.view.list'), organizationalScopeMiddleware]
  }, assetController.getDepreciationReport.bind(assetController));

  fastify.get('/assets/consumables', {
    preHandler: [requireCapability('sarpras.inventory.view.list'), organizationalScopeMiddleware]
  }, assetController.getConsumables.bind(assetController));

  fastify.put('/assets/consumables/:id/threshold', {
    preHandler: [requireCapability('sarpras.inventory.manage'), organizationalScopeMiddleware]
  }, assetController.updateConsumableThreshold.bind(assetController));

  fastify.post('/assets/consumables/:id/consume', {
    preHandler: [requireCapability('sarpras.inventory.manage'), organizationalScopeMiddleware]
  }, assetController.consumeAsset.bind(assetController));

  // --- Real-time Dashboard ---
  fastify.get('/assets/dashboard/realtime', {
    preHandler: [requireCapability('sarpras.inventory.view.list'), organizationalScopeMiddleware]
  }, assetController.getRealtimeStats.bind(assetController));

  fastify.get('/assets/scan/:code', {
    preHandler: [requireCapability('sarpras.inventory.view.list'), organizationalScopeMiddleware]
  }, assetController.scanAsset.bind(assetController));

  fastify.post('/assets/opname', {
    preHandler: [requireCapability('sarpras.inventory.manage'), organizationalScopeMiddleware]
  }, assetController.runStockOpname.bind(assetController));

  // --- Loans ---
  fastify.get('/loans', {
    preHandler: [requireCapability('sarpras.loans.view.list'), organizationalScopeMiddleware]
  }, loanController.getLoans.bind(loanController));

  fastify.post('/loans', {
    preHandler: [requireCapability('sarpras.loans.request'), organizationalScopeMiddleware]
  }, loanController.requestLoan.bind(loanController));

  fastify.put('/loans/:id/status', {
    preHandler: [requireCapability('sarpras.loans.manage'), organizationalScopeMiddleware]
  }, loanController.updateStatus.bind(loanController));

  fastify.get('/scanner/user', {
    preHandler: [requireCapability('sarpras.loans.request')]
  }, loanController.scanUser.bind(loanController));

  // --- Repairs / Maintenance ---
  fastify.get('/repairs', {
    preHandler: [requireCapability('sarpras.repairs.view.list'), organizationalScopeMiddleware]
  }, repairController.getRepairs.bind(repairController));

  fastify.get('/repairs/stats', {
    preHandler: [requireCapability('sarpras.repairs.view.list'), organizationalScopeMiddleware]
  }, repairController.getRepairStats.bind(repairController));

  fastify.post('/repairs', {
    preHandler: [requireCapability('sarpras.repairs.manage'), organizationalScopeMiddleware]
  }, repairController.createRepair.bind(repairController));

  fastify.put('/repairs/:id', {
    preHandler: [requireCapability('sarpras.repairs.manage'), organizationalScopeMiddleware]
  }, repairController.updateRepair.bind(repairController));

  fastify.get('/repairs/calendar', {
    preHandler: [requireCapability('sarpras.repairs.view.list'), organizationalScopeMiddleware]
  }, repairController.getRepairsCalendar.bind(repairController));
}
