-- Create enum types
CREATE TYPE public.year_level AS ENUM ('FY', 'SY', 'TY', 'Final Year');
CREATE TYPE public.subject_type AS ENUM ('lecture', 'lab', 'tutorial');
CREATE TYPE public.day_of_week AS ENUM ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday');

-- Create classrooms table
CREATE TABLE public.classrooms (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    capacity INTEGER NOT NULL DEFAULT 60,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create faculty table
CREATE TABLE public.faculty (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subjects table
CREATE TABLE public.subjects (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    year_level year_level NOT NULL,
    weekly_hours INTEGER NOT NULL DEFAULT 3,
    has_lab BOOLEAN NOT NULL DEFAULT false,
    has_tutorial BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create faculty_subjects table (many-to-many relationship)
CREATE TABLE public.faculty_subjects (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    faculty_id UUID NOT NULL REFERENCES public.faculty(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(faculty_id, subject_id)
);

-- Create sections table
CREATE TABLE public.sections (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    year_level year_level NOT NULL,
    student_count INTEGER NOT NULL DEFAULT 60,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(name, year_level)
);

-- Create timetable table
CREATE TABLE public.timetable (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    faculty_id UUID NOT NULL REFERENCES public.faculty(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    day_of_week day_of_week NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    subject_type subject_type NOT NULL DEFAULT 'lecture',
    batch_number INTEGER DEFAULT 1, -- For labs (1, 2, 3)
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (making tables publicly accessible for this educational system)
CREATE POLICY "Allow all operations on classrooms" ON public.classrooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on faculty" ON public.faculty FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on subjects" ON public.subjects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on faculty_subjects" ON public.faculty_subjects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on sections" ON public.sections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on timetable" ON public.timetable FOR ALL USING (true) WITH CHECK (true);

-- Insert some sample data
INSERT INTO public.classrooms (name, capacity) VALUES 
('Room 101', 60),
('Room 102', 60),
('Lab 201', 30),
('Lab 202', 30),
('Room 301', 80);

INSERT INTO public.faculty (name, email) VALUES 
('Dr. John Smith', 'john.smith@college.edu'),
('Prof. Sarah Johnson', 'sarah.johnson@college.edu'),
('Dr. Mike Wilson', 'mike.wilson@college.edu'),
('Prof. Lisa Davis', 'lisa.davis@college.edu');

INSERT INTO public.subjects (name, code, year_level, weekly_hours, has_lab, has_tutorial) VALUES 
('Mathematics I', 'MATH101', 'FY', 4, false, true),
('Physics I', 'PHY101', 'FY', 3, true, false),
('Programming in C', 'CS101', 'FY', 4, true, true),
('Data Structures', 'CS201', 'SY', 4, true, false),
('Database Systems', 'CS301', 'TY', 3, true, true);