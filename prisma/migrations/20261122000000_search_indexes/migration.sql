-- Search performance for the listing feed.
--
-- The feed filters by college and, optionally, by a course substring. Without
-- these, a course search scans every active listing.

-- Trigram matching so `course_text ILIKE '%...%'` can use an index.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "listings_course_text_trgm_idx"
  ON "listings" USING gin ("course_text" gin_trgm_ops);

-- Fallback path: a college that is not in the master list yet is matched by
-- its free text, case insensitively.
CREATE INDEX IF NOT EXISTS "listings_college_text_lower_idx"
  ON "listings" (lower("college_text"));

-- The ordering keys are read with status on every page of the feed.
CREATE INDEX IF NOT EXISTS "listings_status_boost_order_idx"
  ON "listings" ("status", "is_boosted", "boost_expires_at", "boost_order_key" DESC);
