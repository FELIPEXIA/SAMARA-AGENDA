-- ==============================================================================
-- PROJETO: SAMARA AGENDAMENTO
-- ARQUIVO: queries.sql
-- DESCRIÇÃO: Consultas SQL úteis para o dia a dia do banco de dados
-- ==============================================================================

-- 1. CONSULTAR TODOS OS ATENDIMENTOS DE UMA DATA ESPECÍFICA
SELECT 
    time, 
    end_time, 
    client_name, 
    client_phone, 
    service_title, 
    price, 
    status
FROM public.appointments
WHERE date = '2026-10-28' AND status = 'Confirmado'
ORDER BY time ASC;

-- 2. CALCULAR FATURAMENTO PREVISTO DO MÊS ATUAL
SELECT 
    COUNT(*) AS total_agendamentos,
    SUM(price) AS faturamento_total
FROM public.appointments
WHERE status IN ('Confirmado', 'Concluído')
  AND date >= DATE_TRUNC('month', CURRENT_DATE)
  AND date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';

-- 3. HISTÓRICO DE UMA CLIENTE ESPECÍFICA PELO WHATSAPP
SELECT 
    date, 
    time, 
    service_title, 
    price, 
    status, 
    notes
FROM public.appointments
WHERE client_phone LIKE '%987654321%'
ORDER BY date DESC;

-- 4. CONSULTAR SERVIÇOS MAIS PROCURADOS NO STUDIO
SELECT 
    service_title, 
    COUNT(*) AS vezes_agendado,
    SUM(price) AS receita_gerada
FROM public.appointments
WHERE status IN ('Confirmado', 'Concluído')
GROUP BY service_title
ORDER BY vezes_agendado DESC;
