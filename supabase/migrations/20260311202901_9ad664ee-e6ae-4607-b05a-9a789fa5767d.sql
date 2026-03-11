
-- Allow admins to read all profiles
CREATE POLICY "Admins can read all profiles"
ON public.profiles
FOR SELECT
TO public
USING (has_role(auth.uid(), 'admin_fabrica'::app_role));

-- Allow admins to update all profiles
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO public
USING (has_role(auth.uid(), 'admin_fabrica'::app_role));

-- Allow admins to delete profiles
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
TO public
USING (has_role(auth.uid(), 'admin_fabrica'::app_role));
