import { createAvailabilityHub } from '../lib/availabilityHub.js';
import { clock } from '../lib/clock.js';
import { Competition } from '../models/index.js';
import { serializeAvailability } from './competitionService.js';

export const availabilityHub = createAvailabilityHub(async (id) => {
  const competition = await Competition.findById(id).select('seats schedule status').lean();
  return competition && serializeAvailability(competition, clock.now());
});
