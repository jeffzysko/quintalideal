
-- 1. Make proposal-attachments bucket private
UPDATE storage.buckets SET public = false WHERE id = 'proposal-attachments';

-- 2. Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Public can read attachments of shared proposals" ON public.proposal_attachments;

-- 3. Create a proper public read policy that checks public_token
CREATE POLICY "Public can read attachments via proposal token"
ON public.proposal_attachments
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = proposal_attachments.proposal_id
    AND p.public_token IS NOT NULL
    AND p.status NOT IN ('rascunho')
  )
);

-- 4. Update storage policies: drop permissive SELECT and add proper one
DROP POLICY IF EXISTS "Anyone can read proposal attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public can read proposal attachments" ON storage.objects;

-- Allow authenticated users with franchise access to read
CREATE POLICY "Franchise can read own proposal attachments storage"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'proposal-attachments'
);

-- Allow anon to read (needed for public proposal page - files are protected by RLS on proposal_attachments table)
CREATE POLICY "Anon can read proposal attachment files"
ON storage.objects
FOR SELECT
TO anon
USING (
  bucket_id = 'proposal-attachments'
);
