// @ts-nocheck
import { PerangkatCrudController } from './sub/perangkat-crud.controller';
import { PerangkatAiController } from './sub/perangkat-ai.controller';
import { PerangkatPresetsController } from './sub/perangkat-presets.controller';

export class PerangkatAjarController {
  static async upload(...args: any[]) { return PerangkatCrudController.upload(...args); }
  static async download(...args: any[]) { return PerangkatCrudController.download(...args); }
  static async review(...args: any[]) { return PerangkatCrudController.review(...args); }
  static async getList(...args: any[]) { return PerangkatCrudController.getList(...args); }
  static async getDetail(...args: any[]) { return PerangkatCrudController.getDetail(...args); }
  static async delete(...args: any[]) { return PerangkatCrudController.delete(...args); }
  static async bulkDelete(...args: any[]) { return PerangkatCrudController.bulkDelete(...args); }
  static async saveEditor(...args: any[]) { return PerangkatCrudController.saveEditor(...args); }

  static async generateAI(...args: any[]) { return PerangkatAiController.generateAI(...args); }

  static async getTopikPresets(...args: any[]) { return PerangkatPresetsController.getTopikPresets(...args); }
  static async createTopikPreset(...args: any[]) { return PerangkatPresetsController.createTopikPreset(...args); }
  static async updateTopikPreset(...args: any[]) { return PerangkatPresetsController.updateTopikPreset(...args); }
  static async deleteTopikPreset(...args: any[]) { return PerangkatPresetsController.deleteTopikPreset(...args); }
  static async getLibraryTemplates(...args: any[]) { return PerangkatPresetsController.getLibraryTemplates(...args); }
  static async createLibraryTemplate(...args: any[]) { return PerangkatPresetsController.createLibraryTemplate(...args); }
  static async updateLibraryTemplate(...args: any[]) { return PerangkatPresetsController.updateLibraryTemplate(...args); }
  static async deleteLibraryTemplate(...args: any[]) { return PerangkatPresetsController.deleteLibraryTemplate(...args); }
  static async claimLibraryTemplate(...args: any[]) { return PerangkatPresetsController.claimLibraryTemplate(...args); }
}
