ALTER TABLE public.profiles DISABLE TRIGGER protect_franquia_id_trigger;
UPDATE public.profiles SET franquia_id = 'd405a131-c4ec-4850-baa0-077679e1907e' WHERE user_id = '0408f33f-98a4-4b7c-9484-0ab2cc7b46cd';
ALTER TABLE public.profiles ENABLE TRIGGER protect_franquia_id_trigger;