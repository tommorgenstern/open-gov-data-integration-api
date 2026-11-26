import { Level, Participant } from '../statistics/dto/statistics-query.dto';

// Whitelisted enum → safe SQL fragment mappings, shared by the statistics and
// accidents query layers. Only these values can ever reach a SQL identifier.

export const LEVEL_LEN: Record<Level, number> = {
  [Level.state]: 2,
  [Level.district]: 5,
  [Level.municipality]: 8,
};

export const PARTICIPANT_COL: Record<Participant, string> = {
  [Participant.foot]: 'is_foot',
  [Participant.bike]: 'is_bike',
  [Participant.car]: 'is_car',
  [Participant.motorbike]: 'is_motorbike',
  [Participant.truck]: 'is_truck',
  [Participant.other]: 'is_other',
};
