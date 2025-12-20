-- Create the assignments table
CREATE TABLE IF NOT EXISTS public.assignments (
  id BIGSERIAL PRIMARY KEY,
  student_name TEXT NOT NULL UNIQUE,
  secret_friend_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own assignment by entering their exact name
CREATE POLICY "Users can view their own assignment"
  ON public.assignments
  FOR SELECT
  USING (true);
