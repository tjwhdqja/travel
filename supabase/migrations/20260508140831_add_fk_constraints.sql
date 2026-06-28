ALTER TABLE schedules
  ADD CONSTRAINT fk_schedules_trip
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE;

ALTER TABLE expenses
  ADD CONSTRAINT fk_expenses_trip
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE;

ALTER TABLE checklists
  ADD CONSTRAINT fk_checklists_trip
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE;

ALTER TABLE guide_items
  ADD CONSTRAINT fk_guide_items_trip
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE;

ALTER TABLE trip_members
  ADD CONSTRAINT fk_trip_members_trip
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE;
