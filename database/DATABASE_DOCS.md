# 📚 Documentação Oficial: Banco de Dados "Samara Agendamento"

Este documento detalha toda a arquitetura, regras de negócio e dicionário de dados projetado para o banco de dados PostgreSQL (Supabase) do studio da Samara.

---

## 1. Visão Geral da Arquitetura

O banco foi desenhado para resolver 4 desafios críticos do studio:
1. **Duração Real dos Procedimentos:** Bloquear janelas de 40 minutos a 4 horas para impedir conflito de horários.
2. **Snapshot de Preço:** Proteger o faturamento histórico caso a Samara altere valores no futuro.
3. **Agilidade para o Cliente:** Cadastro leve via WhatsApp sem exigir login ou senhas complexas.
4. **Controle de Agenda:** Capacidade de lançar folgas, feriados ou intervalos sem alterar o código.

---

## 2. Dicionário de Dados das Tabelas

### 🏷️ Tabela `public.services`
Catálogo de procedimentos com valores e tempos reais da Samara.

| Coluna | Tipo | Descrição | Exemplo |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT (PK)` | Identificador legível do serviço | `'srv-unha-gel'` |
| `title` | `TEXT` | Nome do procedimento | `'Unha de Gel'` |
| `category` | `TEXT` | Categoria de agrupamento | `'gel'`, `'tradicional'`, `'sobrancelhas'`, `'combos'` |
| `price` | `NUMERIC(10,2)` | Valor cobrado em Reais | `120.00` |
| `duration_minutes` | `INTEGER` | Duração em minutos para cálculo de agenda | `210` (equivale a 3h30) |
| `duration_label` | `TEXT` | Rótulo amigável exibido para a cliente | `'3h30'` |
| `icon` | `TEXT` | Emoji ou ícone do serviço | `'💎'` |
| `is_active` | `BOOLEAN` | Indica se o serviço está ativo | `true` |
| `created_at` | `TIMESTAMPTZ` | Data de criação | `NOW()` |

---

### 📅 Tabela `public.appointments`
Armazena todos os atendimentos marcados.

| Coluna | Tipo | Descrição | Exemplo |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT (PK)` | Código do agendamento | `'apt-104928'` |
| `client_name` | `TEXT` | Nome informado pela cliente | `'Camila Ferreira'` |
| `client_phone` | `TEXT` | WhatsApp com DDD | `'11987654321'` |
| `service_id` | `TEXT (FK)` | Referência ao serviço cadastrado | `'srv-pe-mao'` |
| `service_title` | `TEXT` | Cópia do nome do serviço no momento do agendamento | `'Pé e Mão'` |
| `date` | `DATE` | Data do atendimento | `'2026-10-28'` |
| `time` | `TIME` | Horário de início | `'08:30:00'` |
| `end_time` | `TIME` | Horário previsto de término | `'10:30:00'` |
| `price` | `NUMERIC(10,2)` | Valor cobrado (congelado) | `45.00` |
| `notes` | `TEXT` | Observações da cliente | `'Primeira vez'` |
| `status` | `TEXT` | `'Confirmado'`, `'Concluído'`, `'Cancelado'` | `'Confirmado'` |
| `created_at` | `TIMESTAMPTZ` | Timestamp de marcação | `NOW()` |

---

### 👤 Tabela `public.clients`
Histórico e ficha das clientes que já frequentaram o Studio.

| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `UUID (PK)` | ID único gerado automaticamente |
| `name` | `TEXT` | Nome da cliente |
| `phone` | `TEXT (UNIQUE)` | WhatsApp indexado para busca rápida |
| `notes` | `TEXT` | Ficha técnica (alergias, formatos de unha preferidos) |
| `created_at` | `TIMESTAMPTZ` | Data do primeiro cadastro |

---

### 🚫 Tabela `public.blocked_times`
Folgas, intervalos de almoço e feriados cadastrados pela Samara.

| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `UUID (PK)` | ID único do bloqueio |
| `block_date` | `DATE` | Data do bloqueio |
| `start_time` | `TIME` | Início do intervalo (ou nulo se for o dia todo) |
| `end_time` | `TIME` | Fim do intervalo (ou nulo se for o dia todo) |
| `reason` | `TEXT` | Motivo (ex: `'Almoço'`, `'Curso'`, `'Feriado'`) |
| `created_at` | `TIMESTAMPTZ` | Data de cadastro |

---

### ⚙️ Tabela `public.studio_settings`
Configurações centrais do Studio.

| Coluna | Tipo | Valor Padrão |
| :--- | :--- | :--- |
| `studio_name` | `TEXT` | `'Samara Agendamento'` |
| `whatsapp` | `TEXT` | `'5527988459016'` |
| `address` | `TEXT` | `'Rua Nossa Senhora das Graças, Santo Antônio, Cariacica'` |
| `opening_time` | `TIME` | `'08:30:00'` |
| `closing_time` | `TIME` | `'18:30:00'` |
| `admin_pin` | `TEXT` | `'1234'` |
