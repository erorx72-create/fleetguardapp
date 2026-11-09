ALTER TABLE public.companies ADD COLUMN type text NOT NULL DEFAULT 'fleet_owner' CHECK (type IN ('fleet_owner','safety_agency'));
ALTER TABLE public.drivers ADD COLUMN status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Pending','Pending Approval'));
ALTER TABLE public.vehicles ADD COLUMN status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Maintenance'));
ALTER TABLE public.documents ADD COLUMN state_of_issuance text;
CREATE TABLE public.document_submissions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
 driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
 doc_type public.doc_type NOT NULL CHECK (doc_type IN ('cdl','medical_card','annual_inspection','mvr','drug_test')),
 file_path text NOT NULL UNIQUE, file_name text NOT NULL, state_of_issuance text,
 review_status text NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending','approved','rejected')),
 submitted_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz, reviewed_by uuid,
 CHECK (file_path LIKE company_id::text || '/%')
);
GRANT SELECT ON public.document_submissions TO authenticated;
GRANT ALL ON public.document_submissions TO service_role;
ALTER TABLE public.document_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read submissions" ON public.document_submissions FOR SELECT TO authenticated USING (public.owns_company(company_id));
CREATE INDEX submissions_pending_company ON public.document_submissions(company_id,review_status,submitted_at);
CREATE POLICY "Owners read upload files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='document-uploads' AND public.owns_company((storage.foldername(name))[1]::uuid));
CREATE POLICY "Owners write upload files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='document-uploads' AND public.owns_company((storage.foldername(name))[1]::uuid));
CREATE OR REPLACE FUNCTION public.submission_driver_status() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 UPDATE public.drivers SET status=CASE WHEN EXISTS (SELECT 1 FROM public.document_submissions WHERE driver_id=NEW.driver_id AND review_status='pending') THEN 'Pending Approval' ELSE 'Active' END WHERE id=NEW.driver_id;
 RETURN NEW;
END $$;
CREATE TRIGGER submission_sets_driver_status AFTER INSERT OR UPDATE OF review_status ON public.document_submissions FOR EACH ROW EXECUTE FUNCTION public.submission_driver_status();
CREATE OR REPLACE FUNCTION public.approve_document_submission(_submission uuid, _expires_on date, _state text DEFAULT NULL, _vehicle uuid DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.document_submissions; target_id uuid;
BEGIN
 SELECT * INTO s FROM public.document_submissions WHERE id=_submission FOR UPDATE;
 IF NOT FOUND OR NOT public.owns_company(s.company_id) THEN RAISE EXCEPTION 'Submission unavailable'; END IF;
 IF s.review_status <> 'pending' THEN RAISE EXCEPTION 'Already reviewed'; END IF;
 IF _expires_on IS NULL THEN RAISE EXCEPTION 'Expiration date is required'; END IF;
 IF length(coalesce(_state,'')) > 80 THEN RAISE EXCEPTION 'State is too long'; END IF;
 IF s.doc_type='annual_inspection' THEN
  IF NOT EXISTS (SELECT 1 FROM public.vehicles WHERE id=_vehicle AND company_id=s.company_id) THEN RAISE EXCEPTION 'Select a truck from this company'; END IF;
  SELECT id INTO target_id FROM public.documents WHERE vehicle_id=_vehicle AND doc_type=s.doc_type;
 ELSE
  SELECT id INTO target_id FROM public.documents WHERE driver_id=s.driver_id AND doc_type=s.doc_type;
 END IF;
 IF target_id IS NULL THEN RAISE EXCEPTION 'Checklist item not found'; END IF;
 UPDATE public.documents SET file_path=s.file_path, file_name=s.file_name, uploaded_at=s.submitted_at, expires_on=_expires_on, state_of_issuance=CASE WHEN s.doc_type='cdl' THEN nullif(trim(_state),'') ELSE NULL END WHERE id=target_id;
 UPDATE public.document_submissions SET review_status='approved',reviewed_at=now(),reviewed_by=auth.uid() WHERE id=s.id;
END $$;
REVOKE ALL ON FUNCTION public.approve_document_submission(uuid,date,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.approve_document_submission(uuid,date,text,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.configure_company_type(_company uuid,_type text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NOT public.owns_company(_company) THEN RAISE EXCEPTION 'Company unavailable'; END IF;
 IF _type NOT IN ('fleet_owner','safety_agency') THEN RAISE EXCEPTION 'Invalid company type'; END IF;
 UPDATE public.companies SET type=_type WHERE id=_company;
END $$;
REVOKE ALL ON FUNCTION public.configure_company_type(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.configure_company_type(uuid,text) TO authenticated;