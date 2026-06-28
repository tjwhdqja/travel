-- Remove original duplicate FK constraints (replaced by named CASCADE FKs)
ALTER TABLE checklists DROP CONSTRAINT IF EXISTS fk_trip;
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS fk_trip;
ALTER TABLE schedules DROP CONSTRAINT IF EXISTS fk_trip;
ALTER TABLE trip_members DROP CONSTRAINT IF EXISTS fk_trip;
ALTER TABLE guide_items DROP CONSTRAINT IF EXISTS guide_items_trip_id_fkey;
