-- Migration: Add video_interviews table
-- Run this against your Neon PostgreSQL database

CREATE TABLE IF NOT EXISTS video_interviews (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES visa_applications(id),
  officer_id INTEGER NOT NULL REFERENCES users(id),
  applicant_id INTEGER NOT NULL REFERENCES users(id),
  scheduled_at TIMESTAMP NOT NULL,
  duration INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'scheduled',
  room_name TEXT NOT NULL,
  initiated_by TEXT NOT NULL,
  request_note TEXT,
  interview_result TEXT,
  officer_notes TEXT,
  application_status_updated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_video_interviews_application_id ON video_interviews(application_id);
CREATE INDEX IF NOT EXISTS idx_video_interviews_officer_id ON video_interviews(officer_id);
CREATE INDEX IF NOT EXISTS idx_video_interviews_applicant_id ON video_interviews(applicant_id);
CREATE INDEX IF NOT EXISTS idx_video_interviews_scheduled_at ON video_interviews(scheduled_at);
