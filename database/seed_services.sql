-- ==============================================================================
-- PROJETO: SAMARA AGENDAMENTO
-- ARQUIVO: seed_services.sql
-- DESCRIÇÃO: Carga inicial dos 24 serviços oficiais da tabela da Samara
-- ==============================================================================

INSERT INTO public.services (id, title, category, price, duration_minutes, duration_label, icon) VALUES
-- Tradicionais
('srv-pe-mao', 'Pé e Mão', 'tradicional', 45.00, 120, '2 horas', '🌸'),
('srv-pe', 'Pé', 'tradicional', 35.00, 60, '1 hora', '🦶'),
('srv-mao', 'Mão', 'tradicional', 30.00, 60, '1 hora', '💅'),

-- Sobrancelhas & Henna
('srv-henna', 'Henna', 'sobrancelhas', 35.00, 60, '1 hora', '✨'),
('srv-sobrancelhas', 'Sobrancelhas', 'sobrancelhas', 25.00, 40, '40 minutos', '👁️'),

-- Alongamento & Gel
('srv-unha-gel', 'Unha de Gel', 'gel', 120.00, 210, '3h30', '💎'),
('srv-banho-gel', 'Banho de Gel', 'gel', 90.00, 150, '2h30', '🛡️'),
('srv-esmalte-gel', 'Esmaltação em Gel', 'gel', 60.00, 120, '2 horas', '💖'),
('srv-manutencao', 'Manutenção de Gel', 'gel', 90.00, 180, '3 horas', '🛠️'),

-- Combos Tradicionais
('srv-pe-mao-henna', 'Pé e Mão com Henna', 'combos', 80.00, 180, '3 horas', '🌟'),
('srv-pe-mao-sobrancelhas', 'Pé e Mão com Sobrancelhas', 'combos', 70.00, 180, '3 horas', '🌟'),
('srv-pe-henna', 'Pé com Henna', 'combos', 70.00, 120, '2 horas', '🌸'),
('srv-pe-sobrancelhas', 'Pé com Sobrancelhas', 'combos', 60.00, 90, '1h30', '🌸'),
('srv-mao-henna', 'Mão com Henna', 'combos', 65.00, 100, '1h40', '💅'),
('srv-mao-sobrancelhas', 'Mão com Sobrancelhas', 'combos', 55.00, 90, '1h30', '💅'),

-- Combos com Unha de Gel
('srv-unha-gel-pe', 'Unha de Gel e Pé', 'combos', 155.00, 240, '4 horas', '👑'),
('srv-unha-gel-sobrancelhas', 'Unha de Gel e Sobrancelhas', 'combos', 145.00, 240, '4 horas', '👑'),
('srv-unha-gel-henna', 'Unha de Gel e Henna', 'combos', 155.00, 240, '4 horas', '👑'),

-- Combos com Banho de Gel
('srv-banho-gel-pe', 'Banho de Gel e Pé', 'combos', 125.00, 210, '3h30', '💎'),
('srv-banho-gel-henna', 'Banho de Gel e Henna', 'combos', 125.00, 210, '3h30', '💎'),
('srv-banho-gel-sobrancelhas', 'Banho de Gel e Sobrancelhas', 'combos', 160.00, 210, '3h30', '💎'),

-- Combos com Esmaltação em Gel e Manutenção
('srv-esmalte-gel-henna', 'Esmaltação em Gel e Henna', 'combos', 95.00, 180, '3 horas', '✨'),
('srv-esmalte-gel-sobrancelhas', 'Esmaltação em Gel e Sobrancelhas', 'combos', 85.00, 180, '3 horas', '✨'),
('srv-manutencao-henna', 'Manutenção e Henna', 'combos', 125.00, 240, '4 horas', '👑')
ON CONFLICT (id) DO UPDATE SET 
    title = EXCLUDED.title,
    category = EXCLUDED.category,
    price = EXCLUDED.price,
    duration_minutes = EXCLUDED.duration_minutes,
    duration_label = EXCLUDED.duration_label,
    icon = EXCLUDED.icon;
