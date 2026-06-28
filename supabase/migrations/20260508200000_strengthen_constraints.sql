-- trip_members.trip_id NOT NULL
ALTER TABLE trip_members ALTER COLUMN trip_id SET NOT NULL;

-- guide_items.section 허용값 제약
ALTER TABLE guide_items ADD CONSTRAINT guide_items_section_check
  CHECK (section IN ('attractions', 'restaurants', 'bars', 'activities'));
