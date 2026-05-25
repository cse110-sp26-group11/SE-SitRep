ALTER TABLE availability_slots
ADD COLUMN slot_index INTEGER;

UPDATE availability_slots
SET slot_index = CASE slot_label
  WHEN '9 AM' THEN 0
  WHEN '10 AM' THEN 1
  WHEN '11 AM' THEN 2
  WHEN '12 PM' THEN 3
  WHEN '1 PM' THEN 4
  WHEN '2 PM' THEN 5
  WHEN '3 PM' THEN 6
  WHEN '4 PM' THEN 7
  ELSE 0
END
WHERE slot_index IS NULL;

CREATE UNIQUE INDEX idx_availability_unique_slot_index
ON availability_slots(team_id, user_id, week_start, day_index, slot_index);

CREATE INDEX idx_availability_team_week_slot_index
ON availability_slots(team_id, week_start, day_index, slot_index);
