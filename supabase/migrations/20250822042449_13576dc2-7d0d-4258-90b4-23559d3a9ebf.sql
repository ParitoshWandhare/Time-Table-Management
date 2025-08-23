-- Add subject types to faculty_subjects table
ALTER TABLE public.faculty_subjects 
ADD COLUMN subject_types TEXT[] DEFAULT ARRAY['lecture'];

-- Update existing records to have lecture as default
UPDATE public.faculty_subjects 
SET subject_types = ARRAY['lecture'] 
WHERE subject_types IS NULL OR array_length(subject_types, 1) IS NULL;