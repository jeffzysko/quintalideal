-- Adiciona valor faltante ao enum territory_match_status
-- Necessário para receber leads de feiras com múltiplas franquias organizadoras
-- onde nenhuma cidade foi encontrada no territory matching.
ALTER TYPE territory_match_status ADD VALUE IF NOT EXISTS 'distributed_to_all_organizers';
