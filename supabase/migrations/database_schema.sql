-- =====================================================
-- Complete Timetable Management System Schema
-- 3NF Normalized, ACID Compliant with Proper Indexing
-- Combined setup and cleanup migration
-- =====================================================


-- =====================================================
-- ENUMS: Create custom types
-- =====================================================

DO $$ BEGIN
    CREATE TYPE year_level AS ENUM ('FY', 'SY', 'TY', 'Final Year');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE room_type AS ENUM ('lecture', 'lab', 'tutorial');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE subject_type AS ENUM ('lecture', 'lab', 'tutorial');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE day_of_week AS ENUM ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- TABLES: Create database structure
-- =====================================================

-- Faculty table (3NF: No transitive dependencies)
CREATE TABLE IF NOT EXISTS public.faculty (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sections table (3NF: Atomic values, no partial dependencies)
CREATE TABLE IF NOT EXISTS public.sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    year_level year_level NOT NULL,
    student_count INTEGER NOT NULL DEFAULT 60 CHECK (student_count > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Subjects table (3NF: All non-key attributes depend on primary key only)
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    year_level year_level NOT NULL,
    weekly_hours INTEGER NOT NULL DEFAULT 3 CHECK (weekly_hours > 0),
    has_lab BOOLEAN NOT NULL DEFAULT false,
    has_tutorial BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Classrooms table (3NF: Independent entity with atomic attributes)
CREATE TABLE IF NOT EXISTS public.classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    room_type room_type NOT NULL DEFAULT 'lecture',
    capacity INTEGER NOT NULL DEFAULT 60 CHECK (capacity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Faculty-Subject assignment (Junction table for M:N relationship)
CREATE TABLE IF NOT EXISTS public.faculty_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faculty_id UUID NOT NULL REFERENCES public.faculty(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    subject_types TEXT[] DEFAULT ARRAY['lecture'],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(faculty_id, subject_id)
);

-- Timetable table (Central entity linking all relationships)
CREATE TABLE IF NOT EXISTS public.timetable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    faculty_id UUID NOT NULL REFERENCES public.faculty(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    day_of_week day_of_week NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    subject_type subject_type NOT NULL DEFAULT 'lecture',
    batch_number INTEGER DEFAULT 1 CHECK (batch_number > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (end_time > start_time)
);

-- =====================================================
-- INDEXES: Performance optimization
-- =====================================================

-- Faculty indexes
CREATE INDEX IF NOT EXISTS idx_faculty_email ON public.faculty(email);

-- Sections indexes
CREATE INDEX IF NOT EXISTS idx_sections_year_level ON public.sections(year_level);

-- Subjects indexes
CREATE INDEX IF NOT EXISTS idx_subjects_code ON public.subjects(code);
CREATE INDEX IF NOT EXISTS idx_subjects_year_level ON public.subjects(year_level);

-- Classrooms indexes
CREATE INDEX IF NOT EXISTS idx_classrooms_room_type ON public.classrooms(room_type);
CREATE INDEX IF NOT EXISTS idx_classrooms_name ON public.classrooms(name);

-- Faculty-Subjects indexes
CREATE INDEX IF NOT EXISTS idx_faculty_subjects_faculty ON public.faculty_subjects(faculty_id);
CREATE INDEX IF NOT EXISTS idx_faculty_subjects_subject ON public.faculty_subjects(subject_id);

-- Timetable indexes (Critical for query performance)
CREATE INDEX IF NOT EXISTS idx_timetable_section ON public.timetable(section_id);
CREATE INDEX IF NOT EXISTS idx_timetable_subject ON public.timetable(subject_id);
CREATE INDEX IF NOT EXISTS idx_timetable_faculty ON public.timetable(faculty_id);
CREATE INDEX IF NOT EXISTS idx_timetable_classroom ON public.timetable(classroom_id);
CREATE INDEX IF NOT EXISTS idx_timetable_day_time ON public.timetable(day_of_week, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_timetable_faculty_day_time ON public.timetable(faculty_id, day_of_week, start_time);
CREATE INDEX IF NOT EXISTS idx_timetable_classroom_day_time ON public.timetable(classroom_id, day_of_week, start_time);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all operations on faculty" ON public.faculty;
DROP POLICY IF EXISTS "Allow all operations on sections" ON public.sections;
DROP POLICY IF EXISTS "Allow all operations on subjects" ON public.subjects;
DROP POLICY IF EXISTS "Allow all operations on classrooms" ON public.classrooms;
DROP POLICY IF EXISTS "Allow all operations on faculty_subjects" ON public.faculty_subjects;
DROP POLICY IF EXISTS "Allow all operations on timetable" ON public.timetable;

-- Create permissive policies for all operations
CREATE POLICY "Allow all operations on faculty" ON public.faculty FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on sections" ON public.sections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on subjects" ON public.subjects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on classrooms" ON public.classrooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on faculty_subjects" ON public.faculty_subjects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on timetable" ON public.timetable FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- COMMENTS: Documentation
-- =====================================================

COMMENT ON TABLE public.faculty IS 'Stores faculty/instructor information';
COMMENT ON TABLE public.sections IS 'Stores class sections organized by year level';
COMMENT ON TABLE public.subjects IS 'Stores subject/course information';
COMMENT ON TABLE public.classrooms IS 'Stores classroom/room information with type and capacity';
COMMENT ON TABLE public.faculty_subjects IS 'Maps faculty members to subjects they can teach';
COMMENT ON TABLE public.timetable IS 'Central scheduling table mapping sections, subjects, faculty, and classrooms to time slots';

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Timetable Management System schema setup completed successfully!';
    RAISE NOTICE 'All tables, indexes, and RLS policies have been created.';
END $$;