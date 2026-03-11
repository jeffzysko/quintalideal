ALTER TABLE public.profiles DISABLE TRIGGER protect_franquia_id_trigger;
UPDATE public.profiles SET franquia_id = 'b39febe0-68f8-4f61-8c9e-03ce4efa73f8' WHERE user_id = '4418c0b9-afab-41a4-bd25-1e52031b81ba';
ALTER TABLE public.profiles ENABLE TRIGGER protect_franquia_id_trigger;