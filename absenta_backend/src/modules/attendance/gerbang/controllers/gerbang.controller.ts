import { gerbangTapController } from './sub/gerbang-tap.controller';
import { gerbangFaceController } from './sub/gerbang-face.controller';
import { gerbangRecordsController } from './sub/gerbang-records.controller';
import { gerbangAnalyticsController } from './sub/gerbang-analytics.controller';

export const gerbangController = {
  ...gerbangTapController,
  ...gerbangFaceController,
  ...gerbangRecordsController,
  ...gerbangAnalyticsController
};
