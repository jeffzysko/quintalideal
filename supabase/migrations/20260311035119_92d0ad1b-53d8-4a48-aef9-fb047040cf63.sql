
-- ENUM TYPES
CREATE TYPE public.app_role AS ENUM ('admin_fabrica', 'franquia', 'visualizador');
CREATE TYPE public.lead_status AS ENUM ('novo', 'contatado', 'em_negociacao', 'vendido', 'perdido');
CREATE TYPE public.categoria_tamanho AS ENUM ('pequena', 'media', 'grande');

-- TABLE: franchises
CREATE TABLE public.franchises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_franquia TEXT NOT NULL,
  cidade_base TEXT NOT NULL,
  slug_url TEXT NOT NULL UNIQUE,
  email TEXT,
  whatsapp TEXT,
  responsavel TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.franchises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read franchises" ON public.franchises FOR SELECT USING (true);

-- TABLE: pool_models
CREATE TABLE public.pool_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_modelo TEXT NOT NULL,
  tamanho TEXT,
  comprimento NUMERIC,
  largura NUMERIC,
  profundidade NUMERIC,
  possui_prainha BOOLEAN DEFAULT false,
  possui_spa BOOLEAN DEFAULT false,
  categoria_tamanho categoria_tamanho NOT NULL,
  descricao TEXT,
  imagem_principal TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pool_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read pool models" ON public.pool_models FOR SELECT USING (true);

-- TABLE: leads
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT,
  telefone TEXT,
  email TEXT,
  cidade TEXT,
  franquia_id UUID REFERENCES public.franchises(id),
  pontuacao_quintal INTEGER,
  modelo_recomendado TEXT,
  respostas_questionario JSONB,
  foto1 TEXT,
  foto2 TEXT,
  foto3 TEXT,
  foto4 TEXT,
  status_lead lead_status NOT NULL DEFAULT 'novo',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert leads" ON public.leads FOR INSERT WITH CHECK (true);

-- TABLE: profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  franquia_id UUID REFERENCES public.franchises(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- TABLE: user_roles
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER: has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

-- SECURITY DEFINER: get_user_franquia_id
CREATE OR REPLACE FUNCTION public.get_user_franquia_id(_user_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT franquia_id FROM public.profiles WHERE user_id = _user_id LIMIT 1 $$;

-- RLS leads read
CREATE POLICY "Admins can read all leads" ON public.leads FOR SELECT USING (public.has_role(auth.uid(), 'admin_fabrica'));
CREATE POLICY "Franchise can read own leads" ON public.leads FOR SELECT USING (public.has_role(auth.uid(), 'franquia') AND franquia_id = public.get_user_franquia_id(auth.uid()));

-- RLS leads update
CREATE POLICY "Admins can update all leads" ON public.leads FOR UPDATE USING (public.has_role(auth.uid(), 'admin_fabrica'));
CREATE POLICY "Franchise can update own leads" ON public.leads FOR UPDATE USING (public.has_role(auth.uid(), 'franquia') AND franquia_id = public.get_user_franquia_id(auth.uid()));

-- RLS franchises write (admin)
CREATE POLICY "Admins can insert franchises" ON public.franchises FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin_fabrica'));
CREATE POLICY "Admins can update franchises" ON public.franchises FOR UPDATE USING (public.has_role(auth.uid(), 'admin_fabrica'));
CREATE POLICY "Admins can delete franchises" ON public.franchises FOR DELETE USING (public.has_role(auth.uid(), 'admin_fabrica'));

-- RLS pool_models write (admin)
CREATE POLICY "Admins can insert pool models" ON public.pool_models FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin_fabrica'));
CREATE POLICY "Admins can update pool models" ON public.pool_models FOR UPDATE USING (public.has_role(auth.uid(), 'admin_fabrica'));

-- RLS user_roles
CREATE POLICY "Admins can read all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin_fabrica'));
CREATE POLICY "Users can read own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin_fabrica'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (public.has_role(auth.uid(), 'admin_fabrica'));

-- Trigger: updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$ BEGIN INSERT INTO public.profiles (user_id, full_name) VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name'); RETURN NEW; END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('quintal-photos', 'quintal-photos', true);
CREATE POLICY "Anyone can upload quintal photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'quintal-photos');
CREATE POLICY "Anyone can view quintal photos" ON storage.objects FOR SELECT USING (bucket_id = 'quintal-photos');
