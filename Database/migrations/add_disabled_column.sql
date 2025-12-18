-- Migration: Add disabled column to profiles table
-- Required for admin user disable/enable functionality

ALTER TABLE profiles
ADD COLUMN disabled boolean DEFAULT false;
