// services/index.js

import * as crossmatch from './crossmatch.service.js';
import * as donation from './donation.service.js';
import * as donor from './donor.service.js';
import * as healthScreening from './healthscreening.service.js';
import * as inventory from './inventory.service.js';
import * as labTest from './labTest.service.js';
import * as notification from './notification.service.js';
import * as questionnaire from './questionnaire.service.js';
import * as request from './request.service.js';
import * as patient from './patient.service.js';
import { rankingService } from './ranking.service.js';
import { adminService } from './admin.service.js';

import { authService } from './auth.service.js';

export {
   authService,
    crossmatch,
    donation,
    donor,
    healthScreening,
    inventory,
    labTest,
    notification,
    questionnaire,
    request,
    patient,
    rankingService,
    adminService
};
