// @ts-nocheck
import { sendResponse, sendError } from '@/utils/response';
import { PerangkatAjarService } from '../../services/perangkat-ajar.service';
import { perangkatAjarUploadSchema, perangkatAjarReviewSchema } from '../../services/perangkat-ajar.schema';
import { DocumentStorageService } from '@/modules/document-center/services/document-storage.service';
import { authorizationService } from '@/modules/auth/services/authorization.service';
import { RoleName } from '@/constants/enums';
import { prisma } from '@/utils/prisma';
import { z } from 'zod';
import axios from 'axios';
import { PdfGeneratorService } from '@/modules/reporting/services/pdf-generator.service';
import { buildAIPromptForJenis, buildFallbackHtmlForJenis } from '../../helpers/perangkat-ajar-layout.helper';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';

export class PerangkatAiController {

}


