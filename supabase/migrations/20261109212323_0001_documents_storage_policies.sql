/*
# Document Storage Policies

## Overview
Storage bucket policies for the `documents` bucket, scoped by company ownership.

## Security
- Company owners can read/upload/update/delete files in the `documents` bucket
  where the first path segment matches a company they own.
*/

CREATE POLICY "Company owners read fleet files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND EXISTS (SELECT 1 FROM public.companies c WHERE c.id::text = (storage.foldername(name))[1] AND c.owner_id = auth.uid()));
CREATE POLICY "Company owners upload fleet files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND EXISTS (SELECT 1 FROM public.companies c WHERE c.id::text = (storage.foldername(name))[1] AND c.owner_id = auth.uid()));
CREATE POLICY "Company owners update fleet files" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documents' AND EXISTS (SELECT 1 FROM public.companies c WHERE c.id::text = (storage.foldername(name))[1] AND c.owner_id = auth.uid()));
CREATE POLICY "Company owners delete fleet files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND EXISTS (SELECT 1 FROM public.companies c WHERE c.id::text = (storage.foldername(name))[1] AND c.owner_id = auth.uid()));
