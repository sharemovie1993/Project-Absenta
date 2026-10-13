export type CoopAssetCategory = 
  | 'EQUIPMENT' 
  | 'DISPLAY_FURNITURE' 
  | 'COOLING_APPLIANCE' 
  | 'BUILDING_FACILITY' 
  | 'VEHICLE' 
  | 'OTHER';

export type CoopAssetCondition = 'GOOD' | 'FAIR' | 'DAMAGED' | 'DISPOSED';
export type CoopAssetStatus = 'IN_USE' | 'IN_REPAIR' | 'IDLE' | 'WRITTEN_OFF';

export interface CoopAssetItem {
  id: string;
  code: string;
  name: string;
  category: CoopAssetCategory;
  location: string;
  purchaseDate: string;
  purchasePrice: number;
  condition: CoopAssetCondition;
  status: CoopAssetStatus;
  usefulLifeMonths: number;
  salvageValue: number;
  serialNumber?: string | null;
  picName?: string | null;
  photoUrl?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CoopAssetSummary {
  totalAssets: number;
  totalAcquisitionValue: number;
  goodCount: number;
  damagedCount: number;
  inUseCount: number;
}

export interface CoopAssetFormData {
  name: string;
  category: CoopAssetCategory;
  location: string;
  purchaseDate: string;
  purchasePrice: number;
  condition: CoopAssetCondition;
  status: CoopAssetStatus;
  usefulLifeMonths: number;
  salvageValue?: number;
  serialNumber?: string;
  picName?: string;
  notes?: string;
}
