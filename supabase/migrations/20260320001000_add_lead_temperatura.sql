-- Migration: Add computed `temperatura` column to leads
-- Replicates classifyLead() logic from src/lib/leadScoring.ts

-- 1. Helper function to compute temperatura from quiz answers + score
CREATE OR REPLACE FUNCTION compute_lead_temperatura(
  respostas JSONB,
  pontuacao NUMERIC
) RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  score INT := 0;
  temp TEXT;
BEGIN
  -- Manual override
  IF respostas ? 'temperatura_manual' THEN
    temp := respostas->>'temperatura_manual';
    IF temp IN ('quente', 'morno', 'frio') THEN
      RETURN temp;
    END IF;
  END IF;

  -- Require at least one scoring field
  IF respostas IS NULL OR NOT (
    respostas ? 'orcamento' OR respostas ? 'intencao' OR
    respostas ? 'espaco'    OR respostas ? 'moradia'
  ) THEN
    RETURN 'frio';
  END IF;

  -- Budget
  IF respostas->>'orcamento' = '30-50'   THEN score := score + 3;
  ELSIF respostas->>'orcamento' = '18-30' THEN score := score + 1;
  END IF;

  -- Intent
  IF respostas->>'intencao' = '2026'      THEN score := score + 3;
  ELSIF respostas->>'intencao' = '2026-2027' THEN score := score + 1;
  END IF;

  -- Space
  IF respostas->>'espaco' = 'mais-7' THEN score := score + 2;
  ELSIF respostas->>'espaco' = '5-7'  THEN score := score + 1;
  END IF;

  -- Ownership
  IF respostas->>'moradia' = 'minha' THEN score := score + 1; END IF;

  -- High score bonus
  IF COALESCE(pontuacao, 0) >= 80 THEN score := score + 1; END IF;

  IF score >= 7 THEN RETURN 'quente';
  ELSIF score >= 4 THEN RETURN 'morno';
  ELSE RETURN 'frio';
  END IF;
END;
$$;

-- 2. Add the column (nullable initially for backfill)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS temperatura TEXT;

-- 3. Backfill existing rows
UPDATE leads
SET temperatura = compute_lead_temperatura(respostas_questionario, pontuacao_quintal)
WHERE temperatura IS NULL;

-- 4. Set default for new rows
ALTER TABLE leads ALTER COLUMN temperatura SET DEFAULT 'frio';

-- 5. Trigger function
CREATE OR REPLACE FUNCTION leads_sync_temperatura()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.temperatura := compute_lead_temperatura(NEW.respostas_questionario, NEW.pontuacao_quintal);
  RETURN NEW;
END;
$$;

-- 6. Attach trigger (BEFORE INSERT OR UPDATE)
DROP TRIGGER IF EXISTS trg_leads_temperatura ON leads;
CREATE TRIGGER trg_leads_temperatura
  BEFORE INSERT OR UPDATE OF respostas_questionario, pontuacao_quintal
  ON leads
  FOR EACH ROW EXECUTE FUNCTION leads_sync_temperatura();

-- 7. Index for server-side temperature filter
CREATE INDEX IF NOT EXISTS leads_temperatura_idx ON leads(temperatura);
