/**
 * SAMARA AGENDAMENTO - INTEGRAÇÃO DIRETA COM SUPABASE
 * - Carrega os 24 serviços oficiais direto da tabela public.services
 * - Bloqueio de horários por sobreposição de tempo (de 40 min a 4 horas)
 * - Suporte a public.blocked_times (folgas / bloqueios da Samara)
 * - Cadastro automático de clientes em public.clients
 * - Registro de agendamentos em public.appointments com cálculo de end_time
 */

const SUPABASE_URL = 'https://fsvvmjemizinrymffgvf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzdnZtamVtaXppbnJ5bWZmZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxMTk4MjUsImV4cCI6MjEwODY5NTgyNX0.7qTN4XDS0iyifoPcOI5B6ifCbsNPi3C-WsrYGPDmbDY';

let supabaseClient = null;
if (window.supabase) {
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✓ Supabase inicializado com sucesso.');
  } catch (err) {
    console.warn('Erro ao inicializar Supabase:', err);
  }
}

// ID Oficial da Planilha Google da Samara e Conector Google Apps Script
const SAMARA_SPREADSHEET_ID = '1QojXTSpQl6D4jp3_CG6aDKYOb-vlukehjpfrN0kNgCY';
const DEFAULT_SHEETS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwRWKeLMMLvbpeZ2CCINitbLJO3RMX5hTKmVblEuZzDtDJWTVBrmcEc66HAF6xA5J_CfQ/exec';
const SAMARA_WEEKDAYS = ['Dom', 'Seg', 'Terc', 'Quart', 'Quint', 'Sext', 'Sab'];

// Catálogo Base (Fallback e Inicialização + Combos da Planilha da Samara)
const FALLBACK_SERVICES = [
  { id: 'srv-mao', title: 'Mão', category: 'tradicional', price: 30, durationMinutes: 60, durationLabel: '1 hora', icon: '💅' },
  { id: 'srv-pe', title: 'Pé', category: 'tradicional', price: 35, durationMinutes: 60, durationLabel: '1 hora', icon: '🦶' },
  { id: 'srv-pe-mao', title: 'Pé e Mão', category: 'tradicional', price: 45, durationMinutes: 120, durationLabel: '2 horas', icon: '🌸' },
  { id: 'srv-sobrancelhas', title: 'Sobrancelhas', category: 'sobrancelhas', price: 25, durationMinutes: 40, durationLabel: '40 minutos', icon: '👁️' },
  { id: 'srv-henna', title: 'Henna', category: 'sobrancelhas', price: 35, durationMinutes: 60, durationLabel: '1 hora', icon: '✨' },
  { id: 'srv-unha-gel', title: 'Unha de Gel', category: 'gel', price: 120, durationMinutes: 210, durationLabel: '3h30', icon: '💎' },
  { id: 'srv-banho-gel', title: 'Banho de Gel', category: 'gel', price: 90, durationMinutes: 150, durationLabel: '2h30', icon: '🛡️' },
  { id: 'srv-esmalte-gel', title: 'Esmaltação em Gel', category: 'gel', price: 60, durationMinutes: 120, durationLabel: '2 horas', icon: '💖' },
  { id: 'srv-manutencao', title: 'Manutenção de Gel', category: 'gel', price: 90, durationMinutes: 180, durationLabel: '3 horas', icon: '🛠️' },
  { id: 'srv-pe-mao-henna', title: 'Pé e Mão com Henna', category: 'combos', price: 80, durationMinutes: 180, durationLabel: '3 horas', icon: '🌟' },
  { id: 'srv-pe-mao-sobrancelhas', title: 'Pé e Mão com Sobrancelhas', category: 'combos', price: 70, durationMinutes: 180, durationLabel: '3 horas', icon: '🌟' },
  { id: 'srv-pe-henna', title: 'Pé com Henna', category: 'combos', price: 70, durationMinutes: 120, durationLabel: '2 horas', icon: '🌸' },
  { id: 'srv-pe-sobrancelhas', title: 'Pé com Sobrancelhas', category: 'combos', price: 60, durationMinutes: 90, durationLabel: '1h30', icon: '🌸' },
  { id: 'srv-mao-henna', title: 'Mão com Henna', category: 'combos', price: 65, durationMinutes: 100, durationLabel: '1h40', icon: '💅' },
  { id: 'srv-mao-sobrancelhas', title: 'Mão com Sobrancelhas', category: 'combos', price: 55, durationMinutes: 90, durationLabel: '1h30', icon: '💅' },
  { id: 'srv-unha-gel-pe', title: 'Unha de Gel e Pé', category: 'combos', price: 155, durationMinutes: 240, durationLabel: '4 horas', icon: '👑' },
  { id: 'srv-unha-gel-sobrancelhas', title: 'Unha de Gel e Sobrancelhas', category: 'combos', price: 145, durationMinutes: 240, durationLabel: '4 horas', icon: '👑' },
  { id: 'srv-unha-gel-henna', title: 'Unha de Gel e Henna', category: 'combos', price: 155, durationMinutes: 240, durationLabel: '4 horas', icon: '👑' },
  { id: 'srv-banho-gel-pe', title: 'Banho de Gel e Pé', category: 'combos', price: 125, durationMinutes: 210, durationLabel: '3h30', icon: '💎' },
  { id: 'srv-banho-gel-henna', title: 'Banho de Gel e Henna', category: 'combos', price: 125, durationMinutes: 210, durationLabel: '3h30', icon: '💎' },
  { id: 'srv-banho-gel-sobrancelhas', title: 'Banho de Gel e Sobrancelhas', category: 'combos', price: 160, durationMinutes: 210, durationLabel: '3h30', icon: '💎' },
  { id: 'srv-esmalte-gel-henna', title: 'Esmaltação em Gel e Henna', category: 'combos', price: 95, durationMinutes: 180, durationLabel: '3 horas', icon: '✨' },
  { id: 'srv-esmalte-gel-sobrancelhas', title: 'Esmaltação em Gel e Sobrancelhas', category: 'combos', price: 85, durationMinutes: 180, durationLabel: '3 horas', icon: '✨' },
  { id: 'srv-manutencao-pe', title: 'Manutenção pé', category: 'combos', price: 125, durationMinutes: 210, durationLabel: '3h30', icon: '🛠️' },
  { id: 'srv-manutencao-henna', title: 'Manutenção e Henna', category: 'combos', price: 125, durationMinutes: 240, durationLabel: '4 horas', icon: '👑' },
  { id: 'srv-manutencao-pe-sobrancelhas', title: 'Manutenção Pé e Sobrancelhas', category: 'combos', price: 150, durationMinutes: 240, durationLabel: '4 horas', icon: '👑' },
  { id: 'srv-manutencao-pe-henna', title: 'Manutenção Pé e Henna', category: 'combos', price: 160, durationMinutes: 240, durationLabel: '4 horas', icon: '👑' }
];

// Agendamentos Reais da Planilha da Samara (Abas NOVEMBRO 2026 e DEZEMBRO 2026) sincronizados via Google Sheets
const INITIAL_SHEET_BOOKINGS_NOV_2026 = [
  // NOVEMBRO 2026
  { id: 'sheet-20261102-0700', date: '2026-11-02', time: '07:00', endTime: '10:30', clientName: 'barbara', clientPhone: 'Planilha Google', serviceId: 'srv-manutencao-pe', serviceTitle: 'Manutenção pé', price: 125, status: 'Confirmado', source: 'google_sheets' },
  { id: 'sheet-20261103-0700', date: '2026-11-03', time: '07:00', endTime: '10:30', clientName: 'odete', clientPhone: 'Planilha Google', serviceId: 'srv-manutencao-pe', serviceTitle: 'Manutenção pé', price: 125, status: 'Confirmado', source: 'google_sheets' },
  { id: 'sheet-20261103-1300', date: '2026-11-03', time: '13:00', endTime: '16:30', clientName: 'jhenifer', clientPhone: 'Planilha Google', serviceId: 'srv-unha-gel', serviceTitle: 'Unha de Gel', price: 120, status: 'Confirmado', source: 'google_sheets' },
  { id: 'sheet-20261104-0700', date: '2026-11-04', time: '07:00', endTime: '08:00', clientName: 'Ana', clientPhone: 'Planilha Google', serviceId: 'srv-pe', serviceTitle: 'Pé', price: 35, status: 'Confirmado', source: 'google_sheets' },
  { id: 'sheet-20261104-0800', date: '2026-11-04', time: '08:00', endTime: '10:00', clientName: 'Andressa', clientPhone: 'Planilha Google', serviceId: 'srv-pe-mao', serviceTitle: 'Pé e Mão', price: 45, status: 'Confirmado', source: 'google_sheets' },
  { id: 'sheet-20261105-0700', date: '2026-11-05', time: '07:00', endTime: '10:00', clientName: 'odete', clientPhone: 'Planilha Google', serviceId: 'srv-manutencao', serviceTitle: 'Manutenção', price: 90, status: 'Confirmado', source: 'google_sheets' },
  { id: 'sheet-20261105-1400', date: '2026-11-05', time: '14:00', endTime: '15:30', clientName: 'academia', clientPhone: 'Compromisso Samara', serviceId: 'srv-mao', serviceTitle: 'Compromisso (academia)', price: 0, status: 'Confirmado', source: 'google_sheets' },
  { id: 'sheet-20261106-0700', date: '2026-11-06', time: '07:00', endTime: '11:00', clientName: 'graça', clientPhone: 'Planilha Google', serviceId: 'srv-unha-gel-pe', serviceTitle: 'Unha de Gel e Pé', price: 90, status: 'Confirmado', source: 'google_sheets' },
  { id: 'sheet-20261106-1330', date: '2026-11-06', time: '13:30', endTime: '15:30', clientName: 'tereza', clientPhone: 'Planilha Google', serviceId: 'srv-pe-henna', serviceTitle: 'Pé Henna', price: 70, status: 'Confirmado', source: 'google_sheets' },
  { id: 'sheet-20261107-0700', date: '2026-11-07', time: '07:00', endTime: '08:30', clientName: 'academia', clientPhone: 'Compromisso Samara', serviceId: 'srv-mao', serviceTitle: 'Compromisso (academia)', price: 0, status: 'Confirmado', source: 'google_sheets' },
  { id: 'sheet-20261107-0930', date: '2026-11-07', time: '09:30', endTime: '11:30', clientName: 'ketely', clientPhone: 'Planilha Google', serviceId: 'srv-pe-mao', serviceTitle: 'Pé e Mão', price: 45, status: 'Confirmado', source: 'google_sheets' },
  { id: 'sheet-20261110-0600', date: '2026-11-10', time: '06:00', endTime: '09:00', clientName: 'Mari', clientPhone: 'Planilha Google', serviceId: 'srv-manutencao', serviceTitle: 'Manutenção', price: 90, status: 'Confirmado', source: 'google_sheets' },
  { id: 'sheet-20261110-1300', date: '2026-11-10', time: '13:00', endTime: '16:00', clientName: 'Marly', clientPhone: 'Planilha Google', serviceId: 'srv-manutencao', serviceTitle: 'Manutenção', price: 90, status: 'Confirmado', source: 'google_sheets' },
  { id: 'sheet-20261111-1300', date: '2026-11-11', time: '13:00', endTime: '16:00', clientName: 'yasmin', clientPhone: 'Planilha Google', serviceId: 'srv-manutencao', serviceTitle: 'Manutenção', price: 90, status: 'Confirmado', source: 'google_sheets' },
  { id: 'sheet-20261112-0800', date: '2026-11-12', time: '08:00', endTime: '09:00', clientName: 'kemely', clientPhone: 'Planilha Google', serviceId: 'srv-henna', serviceTitle: 'Henna', price: 35, status: 'Confirmado', source: 'google_sheets' },
  { id: 'sheet-20261112-1300', date: '2026-11-12', time: '13:00', endTime: '16:00', clientName: 'karla', clientPhone: 'Planilha Google', serviceId: 'srv-manutencao', serviceTitle: 'Manutenção', price: 90, status: 'Confirmado', source: 'google_sheets' },
  { id: 'sheet-20261113-0800', date: '2026-11-13', time: '08:00', endTime: '10:00', clientName: 'kemely', clientPhone: 'Planilha Google', serviceId: 'srv-pe-mao', serviceTitle: 'Pé e Mão', price: 45, status: 'Confirmado', source: 'google_sheets' },
  { id: 'sheet-20261114-0700', date: '2026-11-14', time: '07:00', endTime: '10:30', clientName: 'japa', clientPhone: 'Planilha Google', serviceId: 'srv-manutencao-pe', serviceTitle: 'Manutenção pé', price: 120, status: 'Confirmado', source: 'google_sheets' },
  { id: 'sheet-20261116-0630', date: '2026-11-16', time: '06:30', endTime: '09:00', clientName: 'jerusa', clientPhone: 'Planilha Google', serviceId: 'srv-esmalte-gel', serviceTitle: 'Esmaltação em Gel Pé', price: 90, status: 'Confirmado', source: 'google_sheets' },
  { id: 'sheet-20261116-1300', date: '2026-11-16', time: '13:00', endTime: '14:00', clientName: 'ciene', clientPhone: 'Planilha Google', serviceId: 'srv-pe', serviceTitle: 'Pé', price: 35, status: 'Confirmado', source: 'google_sheets' },
  { id: 'sheet-20261117-0930', date: '2026-11-17', time: '09:30', endTime: '11:30', clientName: 'Silvana', clientPhone: 'Planilha Google', serviceId: 'srv-pe-mao', serviceTitle: 'Pé e Mão', price: 45, status: 'Confirmado', source: 'google_sheets' },
  { id: 'sheet-20261118-0700', date: '2026-11-18', time: '07:00', endTime: '10:30', clientName: 'sandra', clientPhone: 'Planilha Google', serviceId: 'srv-manutencao-pe', serviceTitle: 'Manutenção pé', price: 125, status: 'Confirmado', source: 'google_sheets' },
  { id: 'sheet-20261121-0600', date: '2026-11-21', time: '06:00', endTime: '10:00', clientName: 'manu', clientPhone: 'Planilha Google', serviceId: 'srv-manutencao-pe-henna', serviceTitle: 'Manutenção Pé e Henna', price: 145, status: 'Confirmado', source: 'google_sheets' },
  { id: 'sheet-20261123-1600', date: '2026-11-23', time: '16:00', endTime: '19:00', clientName: 'michele', clientPhone: 'Planilha Google', serviceId: 'srv-manutencao', serviceTitle: 'Manutenção', price: 90, status: 'Confirmado', source: 'google_sheets' },
  { id: 'sheet-20261124-1300', date: '2026-11-24', time: '13:00', endTime: '16:00', clientName: 'Aline', clientPhone: 'Planilha Google', serviceId: 'srv-manutencao', serviceTitle: 'Manutenção', price: 90, status: 'Confirmado', source: 'google_sheets' },
  { id: 'sheet-20261125-0630', date: '2026-11-25', time: '06:30', endTime: '10:30', clientName: 'ana', clientPhone: 'Planilha Google', serviceId: 'srv-manutencao-pe-sobrancelhas', serviceTitle: 'Manutenção Pé e Sobrancelhas', price: 135, status: 'Confirmado', source: 'google_sheets' },
  { id: 'sheet-20261126-0630', date: '2026-11-26', time: '06:30', endTime: '10:30', clientName: 'ana', clientPhone: 'Planilha Google', serviceId: 'srv-manutencao-pe-sobrancelhas', serviceTitle: 'Manutenção Pé e Sobrancelhas', price: 135, status: 'Confirmado', source: 'google_sheets' },
  // DEZEMBRO 2026
  { id: 'sheet-20261201-0800', date: '2026-12-01', time: '08:00', endTime: '09:00', clientName: 'kemely', clientPhone: 'Planilha Google', serviceId: 'srv-henna', serviceTitle: 'Henna', price: 35, status: 'Confirmado', source: 'google_sheets' },
  { id: 'sheet-20261204-0630', date: '2026-12-04', time: '06:30', endTime: '09:30', clientName: 'Ana', clientPhone: 'Planilha Google', serviceId: 'srv-pe-mao-sobrancelhas', serviceTitle: 'Pé e Mão Sobrancelhas', price: 70, status: 'Confirmado', source: 'google_sheets' },
  { id: 'sheet-20261209-0630', date: '2026-12-09', time: '06:30', endTime: '09:30', clientName: 'kamily', clientPhone: 'Planilha Google', serviceId: 'srv-manutencao', serviceTitle: 'Manutenção', price: 90, status: 'Confirmado', source: 'google_sheets' },
  { id: 'sheet-20261218-1300', date: '2026-12-18', time: '13:00', endTime: '16:00', clientName: 'aline', clientPhone: 'Planilha Google', serviceId: 'srv-manutencao', serviceTitle: 'Manutenção', price: 90, status: 'Confirmado', source: 'google_sheets' },
  { id: 'sheet-20261221-0700', date: '2026-12-21', time: '07:00', endTime: '10:00', clientName: 'Aline', clientPhone: 'Planilha Google', serviceId: 'srv-manutencao', serviceTitle: 'Manutenção', price: 90, status: 'Confirmado', source: 'google_sheets' },
  { id: 'sheet-20261221-1530', date: '2026-12-21', time: '15:30', endTime: '17:00', clientName: 'hemely', clientPhone: 'Planilha Google', serviceId: 'srv-pe-sobrancelhas', serviceTitle: 'Pé Sobrancelhas', price: 60, status: 'Confirmado', source: 'google_sheets' },
  { id: 'sheet-20261222-0700', date: '2026-12-22', time: '07:00', endTime: '10:00', clientName: 'ketely', clientPhone: 'Planilha Google', serviceId: 'srv-pe-mao-henna', serviceTitle: 'Pé e Mão Henna', price: 80, status: 'Confirmado', source: 'google_sheets' },
  { id: 'sheet-20261222-1300', date: '2026-12-22', time: '13:00', endTime: '14:00', clientName: 'kamily', clientPhone: 'Planilha Google', serviceId: 'srv-henna', serviceTitle: 'Henna', price: 35, status: 'Confirmado', source: 'google_sheets' },
  { id: 'sheet-20261222-1400', date: '2026-12-22', time: '14:00', endTime: '16:00', clientName: 'silvana', clientPhone: 'Planilha Google', serviceId: 'srv-pe-mao', serviceTitle: 'Pé e Mão', price: 45, status: 'Confirmado', source: 'google_sheets' },
  { id: 'sheet-20261222-1730', date: '2026-12-22', time: '17:30', endTime: '19:30', clientName: 'Francisca', clientPhone: 'Planilha Google', serviceId: 'srv-pe-mao', serviceTitle: 'Pé e Mão', price: 45, status: 'Confirmado', source: 'google_sheets' },
  { id: 'sheet-20261223-0630', date: '2026-12-23', time: '06:30', endTime: '08:30', clientName: 'Keyla', clientPhone: 'Planilha Google', serviceId: 'srv-pe-mao', serviceTitle: 'Pé e Mão', price: 45, status: 'Confirmado', source: 'google_sheets' },
  { id: 'sheet-20261223-0830', date: '2026-12-23', time: '08:30', endTime: '09:30', clientName: 'kemely', clientPhone: 'Planilha Google', serviceId: 'srv-henna', serviceTitle: 'Henna', price: 35, status: 'Confirmado', source: 'google_sheets' },
  { id: 'sheet-20261224-0630', date: '2026-12-24', time: '06:30', endTime: '07:30', clientName: 'Keyla', clientPhone: 'Planilha Google', serviceId: 'srv-henna', serviceTitle: 'Henna', price: 35, status: 'Confirmado', source: 'google_sheets' },
  { id: 'sheet-20261224-0830', date: '2026-12-24', time: '08:30', endTime: '10:30', clientName: 'kemely', clientPhone: 'Planilha Google', serviceId: 'srv-pe-mao', serviceTitle: 'Pé e Mão', price: 45, status: 'Confirmado', source: 'google_sheets' },
  { id: 'sheet-20261229-1730', date: '2026-12-29', time: '17:30', endTime: '20:30', clientName: 'Francisca', clientPhone: 'Planilha Google', serviceId: 'srv-pe-mao-sobrancelhas', serviceTitle: 'Pé e Mão Sobrancelhas', price: 70, status: 'Confirmado', source: 'google_sheets' }
];

// Estado da Aplicação
const state = {
  services: FALLBACK_SERVICES,
  selectedService: null,
  selectedServices: [],
  currentCalendarDate: new Date(),
  selectedDate: null,
  selectedTimeSlot: null,
  baseTimeSlots: [
    '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'
  ],
  appointments: [],
  blockedTimes: [],
  serviceSearchQuery: '',
  clients: [],
  clientSearchQuery: '',
  activeCategory: 'all',
  layoutMode: 'idea-b',
  adminFilter: 'all',
  isAdminView: false,
  isAdminAuthenticated: false,
  pinInput: '',
  studioConfig: {
    name: 'Samara Designer',
    whatsapp: '5527988459016',
    address: 'Rua Nossa Senhora das Graças, Santo Antônio, Cariacica',
    pin: '1234',
    defaultSheetStatus: 'Aguardando',
    sheetsWebhookUrl: DEFAULT_SHEETS_WEBHOOK_URL
  },
  lastConfirmedBooking: null
};

const STORAGE_APPTS = 'samara_appts_official';
const STORAGE_CONFIG = 'samara_studio_config';
const STORAGE_SAVED_CLIENT = 'samara_saved_client_profile';

// Inicialização Geral
document.addEventListener('DOMContentLoaded', async () => {
  loadStudioConfig();
  loadSavedClientProfile();
  await loadServicesFromSupabase();
  await loadBlockedTimes();
  await loadAppointments();
  await syncFromGoogleSheets();
  await loadClientsFromSupabase();
  renderServices();
  setupCalendar();
  setupEventListeners();
  updateSummary();
  updateCloudIndicator();
});

// Configurações Locais
function loadStudioConfig() {
  const saved = localStorage.getItem(STORAGE_CONFIG);
  if (saved) {
    try {
      state.studioConfig = { ...state.studioConfig, ...JSON.parse(saved) };
    } catch (e) {
      console.warn('Erro ao carregar config:', e);
    }
  }

  // Garantir atualização caso tenha mantido o telefone ou endereço temporário anterior
  if (!state.studioConfig.name || state.studioConfig.name === 'Samara Agendamento') {
    state.studioConfig.name = 'Samara Designer';
  }
  if (!state.studioConfig.whatsapp || state.studioConfig.whatsapp === '5511999999999' || state.studioConfig.whatsapp === '5527988721801') {
    state.studioConfig.whatsapp = '5527988459016';
  }
  if (!state.studioConfig.address || state.studioConfig.address.includes('Studio Samara • Atendimento com Hora Marcada')) {
    state.studioConfig.address = 'Rua Nossa Senhora das Graças, Santo Antônio, Cariacica';
  }
  if (!state.studioConfig.defaultSheetStatus) {
    state.studioConfig.defaultSheetStatus = 'Aguardando';
  }
  if (!state.studioConfig.sheetsWebhookUrl) {
    state.studioConfig.sheetsWebhookUrl = DEFAULT_SHEETS_WEBHOOK_URL;
  }

  localStorage.setItem(STORAGE_CONFIG, JSON.stringify(state.studioConfig));

  const nameInput = document.getElementById('cfg-studio-name');
  const waInput = document.getElementById('cfg-samara-whatsapp');
  const addrInput = document.getElementById('cfg-studio-address');
  const pinInput = document.getElementById('cfg-admin-pin');
  const statusSelect = document.getElementById('cfg-default-sheet-status');
  const webhookInput = document.getElementById('cfg-sheets-webhook-url');

  if (nameInput) nameInput.value = state.studioConfig.name;
  if (waInput) waInput.value = state.studioConfig.whatsapp;
  if (addrInput) addrInput.value = state.studioConfig.address;
  if (pinInput) pinInput.value = state.studioConfig.pin;
  if (statusSelect) statusSelect.value = state.studioConfig.defaultSheetStatus || 'Aguardando';
  if (webhookInput) webhookInput.value = state.studioConfig.sheetsWebhookUrl || DEFAULT_SHEETS_WEBHOOK_URL;
}

function saveStudioConfig() {
  const nameInput = document.getElementById('cfg-studio-name');
  const waInput = document.getElementById('cfg-samara-whatsapp');
  const addrInput = document.getElementById('cfg-studio-address');
  const pinInput = document.getElementById('cfg-admin-pin');
  const statusSelect = document.getElementById('cfg-default-sheet-status');
  const webhookInput = document.getElementById('cfg-sheets-webhook-url');

  state.studioConfig = {
    name: nameInput.value.trim() || 'Samara Designer',
    whatsapp: waInput.value.trim().replace(/\D/g, '') || '5527988459016',
    address: addrInput.value.trim() || 'Rua Nossa Senhora das Graças, Santo Antônio, Cariacica',
    pin: pinInput.value.trim() || '1234',
    defaultSheetStatus: statusSelect ? statusSelect.value : 'Aguardando',
    sheetsWebhookUrl: (webhookInput && webhookInput.value.trim()) ? webhookInput.value.trim() : DEFAULT_SHEETS_WEBHOOK_URL
  };

  localStorage.setItem(STORAGE_CONFIG, JSON.stringify(state.studioConfig));
  showToast('✓ Configurações do Studio e da Planilha salvas!');
}

// -------------------------------------------------------------
// INTEGRAÇÃO COM A PLANILHA GOOGLE DA SAMARA (COLUNAS A até G)
// -------------------------------------------------------------
// Lista oficial exata da aba 'VALIDAÇÃO DE DADOS' (Coluna E2:E43) da Planilha da Samara
const VALID_SHEET_ARTES = [
  'Pé e Mão',
  'Pé ',
  'Mão',
  'Henna',
  'Sobrancelhas',
  'Pé e Mão Henna',
  'Pé e Mão Sobrancelhas',
  'Pé Henna',
  'Pé Sobrancelhas',
  'Mão e Henna',
  'Mão Sobrancelhas',
  'Unha de Gel',
  'Banho de Gel',
  'Esmaltação em Gel',
  'Unha de Gel  Pé Henna',
  'Unha de Gel Pé Sobrancelhas',
  'Unha de Gel e Pé',
  'Unha de Gel e Sobracelhas',
  'Unha de Gel e Henna',
  'Banho de Gel Pé e Henna',
  'Banho de Gel Pé e Sobracelhas',
  'Banho de Gel e Pé',
  'Banho de Gel Henna',
  'Banho de Gel Sobracelhas',
  'Esmaltação em Gel Pé Henna',
  'Esmaltação em Gel Pé Sobrancelhas',
  'Esmaltação em Gel Pé',
  'Esmaltação em Gel e Henna',
  'Esmataltação em Gel Sobracelhas',
  'Manutenção',
  'Manutenção pé',
  'Manutenção hena',
  'Manutenção ',
  'Pé gel',
  'Pé gel henna',
  'Pé gel sobrancelhas',
  'Pé gel  unha de gel',
  'Pé gel  e mão',
  'Pé gel e mão manutenção',
  'Manutenção e Henna',
  'Manutenção Pé e Henna',
  'Manutenção Pé e Sobrancelhas'
];

function mapServiceToSpreadsheetArte(serviceTitle) {
  const raw = String(serviceTitle || '').trim();
  const map = {
    'Pé': 'Pé ', // Na aba VALIDAÇÃO DE DADOS da planilha, E3 possui um espaço no final ("Pé ")
    'Mão': 'Mão',
    'Pé e Mão': 'Pé e Mão',
    'Henna': 'Henna',
    'Sobrancelhas': 'Sobrancelhas',
    'Unha de Gel': 'Unha de Gel',
    'Banho de Gel': 'Banho de Gel',
    'Esmaltação em Gel': 'Esmaltação em Gel',
    'Manutenção de Gel': 'Manutenção',
    'Manutenção': 'Manutenção',
    'Manutenção e Pé': 'Manutenção pé',
    'Manutenção pé': 'Manutenção pé',
    'Manutenção e Henna': 'Manutenção e Henna',
    'Manutenção, Pé e Henna': 'Manutenção Pé e Henna',
    'Manutenção Pé e Henna': 'Manutenção Pé e Henna',
    'Manutenção, Pé e Sobrancelhas': 'Manutenção Pé e Sobrancelhas',
    'Manutenção Pé e Sobrancelhas': 'Manutenção Pé e Sobrancelhas',
    'Pé com Henna': 'Pé Henna',
    'Pé e Henna': 'Pé Henna',
    'Pé Henna': 'Pé Henna',
    'Pé com Sobrancelhas': 'Pé Sobrancelhas',
    'Pé e Sobrancelhas': 'Pé Sobrancelhas',
    'Pé Sobrancelhas': 'Pé Sobrancelhas',
    'Mão com Henna': 'Mão e Henna',
    'Mão e Henna': 'Mão e Henna',
    'Mão com Sobrancelhas': 'Mão Sobrancelhas',
    'Mão e Sobrancelhas': 'Mão Sobrancelhas',
    'Mão Sobrancelhas': 'Mão Sobrancelhas',
    'Pé e Mão com Henna': 'Pé e Mão Henna',
    'Pé e Mão e Henna': 'Pé e Mão Henna',
    'Pé e Mão Henna': 'Pé e Mão Henna',
    'Pé e Mão com Sobrancelhas': 'Pé e Mão Sobrancelhas',
    'Pé e Mão e Sobrancelhas': 'Pé e Mão Sobrancelhas',
    'Pé e Mão Sobrancelhas': 'Pé e Mão Sobrancelhas',
    'Unha de Gel e Pé': 'Unha de Gel e Pé',
    'Unha de Gel e Henna': 'Unha de Gel e Henna',
    'Unha de Gel e Sobrancelhas': 'Unha de Gel e Sobracelhas',
    'Unha de Gel, Pé e Henna': 'Unha de Gel  Pé Henna',
    'Unha de Gel, Pé e Sobrancelhas': 'Unha de Gel Pé Sobrancelhas',
    'Banho de Gel e Pé': 'Banho de Gel e Pé',
    'Banho de Gel e Henna': 'Banho de Gel Henna',
    'Banho de Gel e Sobrancelhas': 'Banho de Gel Sobracelhas',
    'Banho de Gel, Pé e Henna': 'Banho de Gel Pé e Henna',
    'Banho de Gel, Pé e Sobrancelhas': 'Banho de Gel Pé e Sobracelhas',
    'Esmaltação em Gel e Pé': 'Esmaltação em Gel Pé',
    'Esmaltação em Gel e Henna': 'Esmaltação em Gel e Henna',
    'Esmaltação em Gel e Sobrancelhas': 'Esmataltação em Gel Sobracelhas',
    'Esmaltação em Gel, Pé e Henna': 'Esmaltação em Gel Pé Henna',
    'Esmaltação em Gel, Pé e Sobrancelhas': 'Esmaltação em Gel Pé Sobrancelhas'
  };

  if (map[raw]) return map[raw];
  if (VALID_SHEET_ARTES.includes(raw)) return raw;

  // Se for um combo personalizado selecionado na Ideia A, encontrar o item válido mais próximo na planilha
  const foundTrimmed = VALID_SHEET_ARTES.find(v => v.trim().toLowerCase() === raw.toLowerCase());
  if (foundTrimmed) return foundTrimmed;

  const lower = raw.toLowerCase();
  if (lower.includes('manutenção') && lower.includes('pé') && lower.includes('henna')) return 'Manutenção Pé e Henna';
  if (lower.includes('manutenção') && lower.includes('pé') && lower.includes('sobrancelha')) return 'Manutenção Pé e Sobrancelhas';
  if (lower.includes('manutenção') && lower.includes('pé')) return 'Manutenção pé';
  if (lower.includes('manutenção') && lower.includes('henna')) return 'Manutenção e Henna';
  if (lower.includes('manutenção')) return 'Manutenção';
  if (lower.includes('unha de gel') && lower.includes('pé') && lower.includes('henna')) return 'Unha de Gel  Pé Henna';
  if (lower.includes('unha de gel') && lower.includes('pé') && lower.includes('sobrancelha')) return 'Unha de Gel Pé Sobrancelhas';
  if (lower.includes('unha de gel') && lower.includes('pé')) return 'Unha de Gel e Pé';
  if (lower.includes('unha de gel') && lower.includes('henna')) return 'Unha de Gel e Henna';
  if (lower.includes('unha de gel') && lower.includes('sobrancelha')) return 'Unha de Gel e Sobracelhas';
  if (lower.includes('unha de gel')) return 'Unha de Gel';
  if (lower.includes('banho de gel') && lower.includes('pé') && lower.includes('henna')) return 'Banho de Gel Pé e Henna';
  if (lower.includes('banho de gel') && lower.includes('pé') && lower.includes('sobrancelha')) return 'Banho de Gel Pé e Sobracelhas';
  if (lower.includes('banho de gel') && lower.includes('pé')) return 'Banho de Gel e Pé';
  if (lower.includes('banho de gel') && lower.includes('henna')) return 'Banho de Gel Henna';
  if (lower.includes('banho de gel') && lower.includes('sobrancelha')) return 'Banho de Gel Sobracelhas';
  if (lower.includes('banho de gel')) return 'Banho de Gel';
  if (lower.includes('esmaltação') && lower.includes('pé') && lower.includes('henna')) return 'Esmaltação em Gel Pé Henna';
  if (lower.includes('esmaltação') && lower.includes('pé') && lower.includes('sobrancelha')) return 'Esmaltação em Gel Pé Sobrancelhas';
  if (lower.includes('esmaltação') && lower.includes('pé')) return 'Esmaltação em Gel Pé';
  if (lower.includes('esmaltação') && lower.includes('henna')) return 'Esmaltação em Gel e Henna';
  if (lower.includes('esmaltação') && lower.includes('sobrancelha')) return 'Esmataltação em Gel Sobracelhas';
  if (lower.includes('esmaltação')) return 'Esmaltação em Gel';
  if (lower.includes('pé') && lower.includes('mão') && lower.includes('henna')) return 'Pé e Mão Henna';
  if (lower.includes('pé') && lower.includes('mão') && lower.includes('sobrancelha')) return 'Pé e Mão Sobrancelhas';
  if (lower.includes('pé') && lower.includes('mão')) return 'Pé e Mão';
  if (lower.includes('pé') && lower.includes('henna')) return 'Pé Henna';
  if (lower.includes('pé') && lower.includes('sobrancelha')) return 'Pé Sobrancelhas';
  if (lower.includes('mão') && lower.includes('henna')) return 'Mão e Henna';
  if (lower.includes('mão') && lower.includes('sobrancelha')) return 'Mão Sobrancelhas';
  if (lower.includes('pé')) return 'Pé ';
  if (lower.includes('mão')) return 'Mão';
  if (lower.includes('henna')) return 'Henna';
  if (lower.includes('sobrancelha')) return 'Sobrancelhas';

  return 'Manutenção';
}

function estimateDurationFromArte(arteTitle) {
  const lower = String(arteTitle || '').toLowerCase();
  if (!lower || lower.includes('academia') || lower.includes('cílios') || lower.includes('cilios') || lower.includes('compromisso')) {
    return 90;
  }
  const found = state.services.find(s =>
    s.title.toLowerCase() === lower ||
    mapServiceToSpreadsheetArte(s.title).toLowerCase() === lower
  );
  if (found) return Number(found.durationMinutes) || 90;
  if (lower.includes('unha de gel') && lower.includes('pé')) return 240;
  if (lower.includes('unha de gel')) return 210;
  if (lower.includes('manutenção') && lower.includes('pé')) return 210;
  if (lower.includes('manutenção')) return 180;
  if (lower.includes('banho de gel')) return 150;
  if (lower.includes('pé e mão')) return 120;
  return 60;
}

function formatAppointmentForSheetColumns(appt) {
  const [y, m, d] = (appt.date || '').split('-').map(Number);
  const dateObj = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
  const diaMes = d || dateObj.getDate();
  const diaSemana = SAMARA_WEEKDAYS[dateObj.getDay()] || 'Seg';
  const horario = appt.time && appt.time.length === 5 ? `${appt.time}:00` : (appt.time || '08:00:00');
  const arte = mapServiceToSpreadsheetArte(appt.serviceTitle);
  const valor = Number(appt.price || 0);
  let statusPlanilha = 'aguardando';
  const stLower = String(appt.status || '').toLowerCase();
  if (stLower.includes('confirm') || stLower.includes('conclu')) {
    statusPlanilha = 'confirmado';
  } else if (stLower.includes('cancel')) {
    statusPlanilha = 'cancelado';
  }

  return {
    dia: diaMes,
    dataSemana: diaSemana,
    cliente: appt.clientName,
    horario: horario,
    arte: arte,
    valor: valor,
    status: statusPlanilha
  };
}

function mergeSheetBookingsIntoState(sheetBookings) {
  if (!Array.isArray(sheetBookings) || sheetBookings.length === 0) return;

  // Manter apenas agendamentos da planilha de Novembro/2026 em diante (evitar abas antigas de 2024/2025)
  state.appointments = state.appointments.filter(a => {
    if (a.source === 'google_sheets' && a.date && a.date < '2026-11-01') return false;
    return true;
  });

  const activeSheetBookings = sheetBookings.filter(sb => sb && sb.date && sb.date >= '2026-11-01');

  const existingByKey = new Map();
  state.appointments.forEach(a => {
    const key = `${a.date}_${(a.time || '').slice(0, 5)}_${(a.clientName || '').trim().toLowerCase()}`;
    existingByKey.set(key, a);
  });

  activeSheetBookings.forEach(sb => {
    const cleanTime = (sb.time || '07:00').slice(0, 5);
    const key = `${sb.date}_${cleanTime}_${(sb.clientName || '').trim().toLowerCase()}`;
    const durMin = estimateDurationFromArte(sb.serviceTitle);
    const startMin = Number(cleanTime.split(':')[0]) * 60 + Number(cleanTime.split(':')[1]);
    const endH = String(Math.floor((startMin + durMin) / 60)).padStart(2, '0');
    const endM = String((startMin + durMin) % 60).padStart(2, '0');
    const calcEnd = sb.endTime || `${endH}:${endM}`;

    if (existingByKey.has(key)) {
      const target = existingByKey.get(key);
      if (sb.status) target.status = sb.status;
      if (!target.endTime) target.endTime = calcEnd;
      target.source = target.source || 'google_sheets';
    } else {
      state.appointments.push({
        id: sb.id || ('sheet-' + sb.date.replace(/-/g, '') + '-' + cleanTime.replace(':', '')),
        clientName: sb.clientName,
        clientPhone: sb.clientPhone || 'Planilha Google',
        serviceId: sb.serviceId || 'srv-mao',
        serviceTitle: sb.serviceTitle,
        date: sb.date,
        time: cleanTime,
        endTime: calcEnd,
        price: Number(sb.price || 0),
        notes: 'Sincronizado da Planilha Google da Samara',
        status: sb.status || 'Confirmado',
        source: 'google_sheets',
        createdAt: new Date().toISOString()
      });
    }
  });

  state.appointments.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.time || '').localeCompare(b.time || '');
  });

  localStorage.setItem(STORAGE_APPTS, JSON.stringify(state.appointments));
}

async function syncFromGoogleSheets() {
  // 1. Garantir os agendamentos conhecidos da aba NOVEMBRO 2026 da planilha da Samara
  mergeSheetBookingsIntoState(INITIAL_SHEET_BOOKINGS_NOV_2026);

  // 2. Buscar todas as abas em tempo real via Conector Google Apps Script
  const webhookUrl = state.studioConfig.sheetsWebhookUrl || DEFAULT_SHEETS_WEBHOOK_URL;
  if (webhookUrl && webhookUrl.startsWith('https://script.google.com/')) {
    try {
      const resp = await fetch(webhookUrl, { method: 'GET', redirect: 'follow' });
      if (resp.ok) {
        const json = await resp.json();
        if (json && json.ok && Array.isArray(json.bookings)) {
          mergeSheetBookingsIntoState(json.bookings);
          console.log(`✓ ${json.bookings.length} linhas sincronizadas ao vivo da Planilha Google.`);
          return true;
        }
      }
    } catch (err) {
      console.warn('Aviso ao ler do conector Apps Script:', err);
    }
  }
  return false;
}

async function syncAppointmentToGoogleSheets(appt, action = 'upsert') {
  const cols = formatAppointmentForSheetColumns(appt);
  const webhookUrl = state.studioConfig.sheetsWebhookUrl || DEFAULT_SHEETS_WEBHOOK_URL;

  if (!webhookUrl || !webhookUrl.startsWith('https://script.google.com/')) {
    console.info('ℹ️ Dados formatados para a Planilha da Samara (Col A-G):', cols);
    return false;
  }

  try {
    const payload = {
      action: action,
      date: appt.date,
      time: appt.time,
      clientName: appt.clientName,
      clientPhone: appt.clientPhone,
      arte: cols.arte,
      price: cols.valor,
      status: cols.status
    };

    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    console.log('✓ Enviado automaticamente para a Planilha Google da Samara:', cols);
    return true;
  } catch (err) {
    console.warn('Aviso ao enviar para a Planilha Google:', err);
    return false;
  }
}

// -------------------------------------------------------------
// SINCRONIZAÇÃO SUPABASE (SERVICES, APPOINTMENTS, BLOCKED, CLIENTS)
// -------------------------------------------------------------
async function loadServicesFromSupabase() {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (!error && data && data.length > 0) {
      const dbServices = data.map(s => ({
        id: s.id,
        title: s.title,
        category: s.category,
        price: Number(s.price),
        durationMinutes: Number(s.duration_minutes),
        durationLabel: s.duration_label,
        icon: s.icon || '💅'
      }));
      // Garantir também os combos extras da planilha da Samara caso ainda não estejam no banco
      const existingIds = new Set(dbServices.map(s => s.id));
      FALLBACK_SERVICES.forEach(fb => {
        if (!existingIds.has(fb.id)) {
          dbServices.push(fb);
        }
      });
      state.services = dbServices;
      console.log(`✓ ${state.services.length} serviços carregados.`);
    }
  } catch (e) {
    console.warn('Usando catálogo local:', e);
  }
}

async function loadBlockedTimes() {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient
      .from('blocked_times')
      .select('*');

    if (!error && data) {
      state.blockedTimes = data;
    }
  } catch (e) {
    console.warn('Erro ao carregar blocked_times:', e);
  }
}

async function loadAppointments() {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('appointments')
        .select('*')
        .order('date', { ascending: true });

      if (!error && data) {
        state.appointments = data.map(dbRow => ({
          id: dbRow.id,
          clientName: dbRow.client_name,
          clientPhone: dbRow.client_phone,
          serviceId: dbRow.service_id,
          serviceTitle: dbRow.service_title,
          date: dbRow.date,
          time: dbRow.time,
          endTime: dbRow.end_time || null,
          price: Number(dbRow.price),
          notes: dbRow.notes || '',
          status: dbRow.status || 'Confirmado',
          createdAt: dbRow.created_at
        }));
        localStorage.setItem(STORAGE_APPTS, JSON.stringify(state.appointments));
        return;
      }
    } catch (e) {
      console.warn('Erro ao buscar appointments do Supabase:', e);
    }
  }

  const cached = localStorage.getItem(STORAGE_APPTS);
  state.appointments = cached ? JSON.parse(cached) : [];
}

async function loadClientsFromSupabase() {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient
      .from('clients')
      .select('*')
      .order('name', { ascending: true });

    if (!error && data) {
      state.clients = data;
    }
  } catch (e) {
    console.warn('Erro ao carregar clients do Supabase:', e);
  }
}

async function saveNewAppointment(appt) {
  // 1. Salvar no cache local
  state.appointments.unshift(appt);
  localStorage.setItem(STORAGE_APPTS, JSON.stringify(state.appointments));

  // 2. Enviar imediatamente para a Planilha Google da Samara (Colunas A-G)
  syncAppointmentToGoogleSheets(appt, 'upsert');

  // 3. Gravar no Supabase (Appointments + Auto-cadastro em Clients)
  if (supabaseClient) {
    try {
      // Inserir agendamento
      const { error: apptErr } = await supabaseClient
        .from('appointments')
        .insert([{
          id: appt.id,
          client_name: appt.clientName,
          client_phone: appt.clientPhone,
          service_id: appt.serviceId,
          service_title: appt.serviceTitle,
          date: appt.date,
          time: appt.time,
          end_time: appt.endTime,
          price: appt.price,
          notes: appt.notes,
          status: appt.status
        }]);

      if (apptErr) console.warn('Erro ao salvar agendamento no Supabase:', apptErr);

      // Auto-cadastro / atualização da cliente na tabela public.clients
      const { error: clientErr } = await supabaseClient
        .from('clients')
        .upsert([{
          name: appt.clientName,
          phone: appt.clientPhone,
          notes: appt.notes || null
        }], { onConflict: 'phone' });

      if (clientErr) console.warn('Aviso: auto-cadastro de cliente:', clientErr);

    } catch (err) {
      console.warn('Exceção ao persistir no Supabase:', err);
    }
  }
}

async function updateAppointmentStatusDB(id, newStatus) {
  const apt = state.appointments.find(a => a.id === id);
  if (apt) {
    apt.status = newStatus;
    localStorage.setItem(STORAGE_APPTS, JSON.stringify(state.appointments));

    // Sincronizar o novo status (confirmado / cancelado) na Coluna G da Planilha da Samara
    syncAppointmentToGoogleSheets(apt, 'status');

    if (supabaseClient) {
      await supabaseClient
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', id);
    }
    renderAdminAppointments();
    renderTimeSlots();
    showToast(`✓ Status atualizado para: ${newStatus}`);
  }
}

async function deleteAppointmentDB(id) {
  state.appointments = state.appointments.filter(a => a.id !== id);
  localStorage.setItem(STORAGE_APPTS, JSON.stringify(state.appointments));

  if (supabaseClient) {
    await supabaseClient
      .from('appointments')
      .delete()
      .eq('id', id);
  }
  renderAdminAppointments();
  showToast('Agendamento excluído.');
}

window.updateAppointmentStatus = updateAppointmentStatusDB;
window.deleteAppointment = deleteAppointmentDB;

function updateCloudIndicator() {
  const dot = document.querySelector('.cloud-dot');
  const text = document.querySelector('.cloud-text');
  if (supabaseClient) {
    dot.style.background = '#4ade80';
    text.textContent = 'Supabase Conectado';
  } else {
    dot.style.background = '#f59e0b';
    text.textContent = 'Modo Offline';
  }
}

// -------------------------------------------------------------
// HELPERS DE MULTI-SERVIÇOS, COMBOS AUTOMÁTICOS, IMAGENS E TELEFONE
// -------------------------------------------------------------
const CORE_IDEA_A_ORDER = [
  'srv-mao',
  'srv-pe',
  'srv-henna',
  'srv-sobrancelhas',
  'srv-unha-gel',
  'srv-banho-gel',
  'srv-manutencao',
  'srv-esmalte-gel',
  'srv-pe-mao'
];

function sortServicesCustomOrder(list) {
  const priorityMap = {};
  CORE_IDEA_A_ORDER.forEach((id, idx) => {
    priorityMap[id] = idx + 1;
  });

  return [...list].sort((a, b) => {
    const isComboA = a.category === 'combos';
    const isComboB = b.category === 'combos';

    // Deixar todos os combos sempre para o final
    if (isComboA && !isComboB) return 1;
    if (!isComboA && isComboB) return -1;

    const prioA = priorityMap[a.id] || 50;
    const prioB = priorityMap[b.id] || 50;
    if (prioA !== prioB) return prioA - prioB;

    return Number(a.price || 0) - Number(b.price || 0);
  });
}

// Mapa de combinações automáticas para aplicar o preço/tempo oficial dos Combos da Samara
const COMBO_EQUIVALENTS = {
  'srv-mao+srv-pe': 'srv-pe-mao',
  'srv-henna+srv-pe-mao': 'srv-pe-mao-henna',
  'srv-henna+srv-mao+srv-pe': 'srv-pe-mao-henna',
  'srv-pe-mao+srv-sobrancelhas': 'srv-pe-mao-sobrancelhas',
  'srv-mao+srv-pe+srv-sobrancelhas': 'srv-pe-mao-sobrancelhas',
  'srv-henna+srv-pe': 'srv-pe-henna',
  'srv-pe+srv-sobrancelhas': 'srv-pe-sobrancelhas',
  'srv-henna+srv-mao': 'srv-mao-henna',
  'srv-mao+srv-sobrancelhas': 'srv-mao-sobrancelhas',
  'srv-pe+srv-unha-gel': 'srv-unha-gel-pe',
  'srv-sobrancelhas+srv-unha-gel': 'srv-unha-gel-sobrancelhas',
  'srv-henna+srv-unha-gel': 'srv-unha-gel-henna',
  'srv-banho-gel+srv-pe': 'srv-banho-gel-pe',
  'srv-banho-gel+srv-henna': 'srv-banho-gel-henna',
  'srv-banho-gel+srv-sobrancelhas': 'srv-banho-gel-sobrancelhas',
  'srv-esmalte-gel+srv-henna': 'srv-esmalte-gel-henna',
  'srv-esmalte-gel+srv-sobrancelhas': 'srv-esmalte-gel-sobrancelhas',
  'srv-henna+srv-manutencao': 'srv-manutencao-henna',
  'srv-manutencao+srv-pe': 'srv-manutencao-pe',
  'srv-henna+srv-manutencao+srv-pe': 'srv-manutencao-pe-henna',
  'srv-manutencao+srv-pe+srv-sobrancelhas': 'srv-manutencao-pe-sobrancelhas'
};

function getServiceImage(serviceId) {
  const id = String(serviceId || '');
  if (id === 'srv-mao' || id.startsWith('srv-mao-')) return 'assets/services/mao.jpg';
  if (id === 'srv-pe' || id === 'srv-pe-henna' || id === 'srv-pe-sobrancelhas') return 'assets/services/pe.jpg';
  if (id.startsWith('srv-pe-mao')) return 'assets/services/pe-mao.jpg';
  if (id.startsWith('srv-unha-gel')) return 'assets/services/unha-gel.jpg';
  if (id.startsWith('srv-banho-gel')) return 'assets/services/banho-gel.jpg';
  if (id.startsWith('srv-esmalte-gel')) return 'assets/services/esmalte-gel.jpg';
  if (id.startsWith('srv-manutencao')) return 'assets/services/manutencao.jpg';
  if (id === 'srv-henna') return 'assets/services/henna.jpg';
  if (id === 'srv-sobrancelhas') return 'assets/services/sobrancelhas.jpg';
  return 'samara-foto.jpg';
}

function getServiceDescription(service) {
  const map = {
    'srv-mao': 'Cutilagem delicada, hidratação e esmaltação impecável nas mãos.',
    'srv-pe': 'Cuidado relaxante de pedicure, cutilagem macia e unhas perfeitas.',
    'srv-pe-mao': 'Cuidado completo de manicure e pedicure tradicional no studio.',
    'srv-sobrancelhas': 'Design personalizado valorizando a simetria e leveza do seu olhar.',
    'srv-henna': 'Design de sobrancelhas com aplicação de henna para definição marcante.',
    'srv-esmalte-gel': 'Esmaltação em gel com secagem em cabine e brilho intenso duradouro.',
    'srv-banho-gel': 'Camada protetora de gel sobre suas unhas naturais para força e brilho.',
    'srv-unha-gel': 'Alongamento em gel resistente, natural e com acabamento de luxo.',
    'srv-manutencao': 'Renovação completa do seu alongamento com nivelamento e brilho novo.'
  };
  return map[service.id] || `Combo especial Samara Designer (${service.durationLabel}).`;
}

function formatDurationLabel(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return '-';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins} minutos`;
  if (mins === 0) return hours === 1 ? '1 hora' : `${hours} horas`;
  return `${hours}h${String(mins).padStart(2, '0')}`;
}

function getSelectedSummary() {
  if (!state.selectedServices || state.selectedServices.length === 0) {
    return null;
  }

  // Verificar se a combinação escolhida equivale a um Combo Oficial da Samara
  const sortedKey = state.selectedServices.map(s => s.id).sort().join('+');
  const matchedComboId = COMBO_EQUIVALENTS[sortedKey];
  if (matchedComboId) {
    const officialCombo = state.services.find(s => s.id === matchedComboId);
    if (officialCombo) {
      return {
        id: officialCombo.id,
        title: officialCombo.title,
        price: Number(officialCombo.price),
        durationMinutes: Number(officialCombo.durationMinutes),
        durationLabel: officialCombo.durationLabel,
        count: state.selectedServices.length,
        isAutoCombo: true
      };
    }
  }

  const totalPrice = state.selectedServices.reduce((sum, s) => sum + Number(s.price || 0), 0);
  const totalDuration = state.selectedServices.reduce((sum, s) => sum + Number(s.durationMinutes || 60), 0);
  const combinedTitle = state.selectedServices.map(s => s.title).join(' + ');
  const durationLabel = state.selectedServices.length === 1
    ? state.selectedServices[0].durationLabel
    : formatDurationLabel(totalDuration);

  return {
    id: state.selectedServices[0].id,
    title: combinedTitle,
    price: totalPrice,
    durationMinutes: totalDuration,
    durationLabel: durationLabel,
    count: state.selectedServices.length,
    isAutoCombo: false
  };
}

function formatPhoneMask(val) {
  const digits = String(val || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function loadSavedClientProfile() {
  const raw = localStorage.getItem(STORAGE_SAVED_CLIENT);
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    const nameInput = document.getElementById('client-name');
    const phoneInput = document.getElementById('client-phone');
    const notice = document.getElementById('saved-client-notice');
    if (saved && saved.name && saved.phone && nameInput && phoneInput) {
      nameInput.value = saved.name;
      phoneInput.value = formatPhoneMask(saved.phone);
      if (notice) notice.style.display = 'flex';
    }
  } catch (e) {
    console.warn('Erro ao carregar perfil salvo da cliente:', e);
  }
}

function clearSavedClientProfile() {
  localStorage.removeItem(STORAGE_SAVED_CLIENT);
  const nameInput = document.getElementById('client-name');
  const phoneInput = document.getElementById('client-phone');
  const notice = document.getElementById('saved-client-notice');
  if (nameInput) {
    nameInput.value = '';
    nameInput.focus();
  }
  if (phoneInput) phoneInput.value = '';
  if (notice) notice.style.display = 'none';
  showToast('Pode digitar os novos dados!');
}

// -------------------------------------------------------------
// RENDERIZAÇÃO DO CARROSSEL INTERATIVO DE SERVIÇOS (IDEIA A & B)
// -------------------------------------------------------------
function renderServices() {
  const grid = document.getElementById('services-grid');
  const dotsContainer = document.getElementById('carousel-dots');
  const counterEl = document.getElementById('carousel-counter');

  const allFilterBtn = document.getElementById('filter-all');
  if (allFilterBtn) {
    allFilterBtn.textContent = `Todos (${state.services.length})`;
  }

  if (!grid) return;
  grid.innerHTML = '';

  // Se houver termo de busca digitado, pesquisa em todos os 24 procedimentos independente da aba ativa
  let filtered = state.serviceSearchQuery
    ? state.services.filter(s => {
        const q = state.serviceSearchQuery.toLowerCase();
        return s.title.toLowerCase().includes(q) || (s.category && s.category.toLowerCase().includes(q));
      })
    : (state.activeCategory === 'all'
        ? state.services
        : state.services.filter(s => s.category === state.activeCategory));

  // Aplicar a sequência oficial: Mão, Pé, Henna, Sobrancelhas, Unha de Gel, Banho de Gel, Manutenção... e Combos no final
  filtered = sortServicesCustomOrder(filtered);

  if (filtered.length === 0) {
    grid.innerHTML = `<p style="width: 100%; text-align: center; color: var(--text-faint); padding: 36px;">Nenhum procedimento encontrado com o termo "${state.serviceSearchQuery}".</p>`;
    if (dotsContainer) dotsContainer.innerHTML = '';
    if (counterEl) counterEl.textContent = '0 / 0';
    renderSelectedServicesPillbar();
    return;
  }

  const categoryNames = {
    tradicional: 'Pé & Mão Tradicional',
    sobrancelhas: 'Sobrancelhas & Henna',
    gel: 'Alongamento & Gel',
    combos: 'Combo Especial'
  };

  filtered.forEach((service, index) => {
    const isSelected = state.selectedServices.some(s => s.id === service.id);
    const card = document.createElement('article');
    card.className = `carousel-card ${isSelected ? 'selected' : ''}`;
    card.id = `service-${service.id}`;
    card.dataset.index = index;
    card.tabIndex = 0;

    const imgUrl = getServiceImage(service.id);
    const desc = getServiceDescription(service);

    card.innerHTML = `
      <div class="carousel-card-media">
        <span class="carousel-card-cat">${service.icon} ${categoryNames[service.category] || service.category}</span>
        ${isSelected ? `<span class="carousel-card-check">✓ Selecionado</span>` : ''}
        <img src="${imgUrl}" alt="${service.title}" class="carousel-card-img" loading="lazy" onerror="this.src='samara-foto.jpg'">
      </div>
      <div class="carousel-card-body">
        <h3 class="carousel-card-title">${service.title}</h3>
        <p class="carousel-card-desc">${desc}</p>
        <div class="carousel-card-meta">
          <span class="carousel-card-duration">⏱️ ${service.durationLabel}</span>
          <span class="carousel-card-price">R$ ${service.price.toFixed(2).replace('.', ',')}</span>
        </div>
        <button type="button" class="carousel-select-btn">
          ${isSelected ? '✓ Procedimento Selecionado' : '+ Selecionar Procedimento'}
        </button>
      </div>
    `;

    card.addEventListener('click', () => selectService(service));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectService(service);
      }
    });

    grid.appendChild(card);
  });

  if (counterEl) {
    counterEl.textContent = `1 / ${filtered.length}`;
  }

  if (dotsContainer) {
    dotsContainer.innerHTML = filtered.map((srv, idx) => `
      <button type="button" class="carousel-dot ${idx === 0 ? 'active' : ''}" data-idx="${idx}" aria-label="Ir para ${srv.title}"></button>
    `).join('');

    dotsContainer.querySelectorAll('.carousel-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        const idx = Number(dot.dataset.idx);
        const targetCard = grid.children[idx];
        if (targetCard) {
          targetCard.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
      });
    });
  }

  renderSelectedServicesPillbar();
}

function renderSelectedServicesPillbar() {
  const pillbar = document.getElementById('selected-services-pillbar');
  const summaryText = document.getElementById('pillbar-summary-text');
  const chipsContainer = document.getElementById('pillbar-chips');
  if (!pillbar || !summaryText || !chipsContainer) return;

  const summary = getSelectedSummary();
  if (!summary) {
    pillbar.style.display = 'none';
    chipsContainer.innerHTML = '';
    return;
  }

  pillbar.style.display = 'flex';
  const comboTag = summary.isAutoCombo ? `👑 Combo "${summary.title}" aplicado!` : (summary.count === 1 ? '1 procedimento selecionado' : `${summary.count} procedimentos combinados`);
  summaryText.textContent = `${comboTag} • ⏱️ ${summary.durationLabel} • R$ ${summary.price.toFixed(2).replace('.', ',')}`;

  chipsContainer.innerHTML = state.selectedServices.map(srv => `
    <span class="selected-srv-chip">
      ${srv.icon} ${srv.title}
      <button type="button" onclick="removeSelectedService('${srv.id}')" title="Remover ${srv.title}">✕</button>
    </span>
  `).join('');
}

function selectService(service) {
  const existsIndex = state.selectedServices.findIndex(s => s.id === service.id);
  if (existsIndex >= 0) {
    state.selectedServices.splice(existsIndex, 1);
    showToast(`Removido: ${service.title}`);
  } else {
    state.selectedServices.push(service);
    showToast(`✓ Adicionado: ${service.title} (${service.durationLabel})`);
  }

  state.selectedService = getSelectedSummary();

  // Ao alterar os serviços, revalidar se o horário escolhido ainda cabe na agenda
  if (state.selectedTimeSlot) {
    state.selectedTimeSlot = null;
  }

  renderServices();
  renderTimeSlots();
  updateSummary();
}

window.removeSelectedService = function(serviceId) {
  state.selectedServices = state.selectedServices.filter(s => s.id !== serviceId);
  state.selectedService = getSelectedSummary();
  state.selectedTimeSlot = null;
  renderServices();
  renderTimeSlots();
  updateSummary();
};

function clearSelectedServices() {
  state.selectedServices = [];
  state.selectedService = null;
  state.selectedTimeSlot = null;
  renderServices();
  renderTimeSlots();
  updateSummary();
}

// -------------------------------------------------------------
// CALENDÁRIO COM BLOQUEIOS DA SAMARA
// -------------------------------------------------------------
function setupCalendar() {
  const today = new Date();
  if (today.getDay() === 0) {
    today.setDate(today.getDate() + 1);
  }
  state.selectedDate = formatDateISO(today);
  renderCalendar();
  renderTimeSlots();
}

function renderCalendar() {
  const monthYearLabel = document.getElementById('calendar-month-year');
  const daysGrid = document.getElementById('calendar-days');
  daysGrid.innerHTML = '';

  const year = state.currentCalendarDate.getFullYear();
  const month = state.currentCalendarDate.getMonth();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  monthYearLabel.textContent = `${monthNames[month]} ${year}`;

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < firstDayIndex; i++) {
    const empty = document.createElement('div');
    empty.className = 'calendar-day empty';
    daysGrid.appendChild(empty);
  }

  for (let day = 1; day <= totalDays; day++) {
    const dayDate = new Date(year, month, day);
    const dayISO = formatDateISO(dayDate);
    const isPast = dayDate < today;
    const isSunday = dayDate.getDay() === 0;

    // Checar se o dia todo está bloqueado na tabela public.blocked_times
    const isDayBlocked = state.blockedTimes.some(b => (b.block_date || b.blockDate) === dayISO && !(b.start_time || b.startTime));

    const isSelected = state.selectedDate === dayISO;
    const isToday = formatDateISO(today) === dayISO;

    const dayBtn = document.createElement('button');
    dayBtn.className = `calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${(isPast || isSunday || isDayBlocked) ? 'disabled' : ''}`;
    dayBtn.textContent = day;
    dayBtn.id = `cal-day-${dayISO}`;

    if (isDayBlocked) {
      dayBtn.title = 'Data bloqueada / Folga da Samara';
    }

    if (!isPast && !isSunday && !isDayBlocked) {
      dayBtn.addEventListener('click', () => {
        state.selectedDate = dayISO;
        state.selectedTimeSlot = null;
        renderCalendar();
        renderTimeSlots();
        updateSummary();
      });
    }

    daysGrid.appendChild(dayBtn);
  }
}

// -------------------------------------------------------------
// HORÁRIOS DE 30 EM 30 MIN COM BLOQUEIO POR DURAÇÃO E HORA ATUAL
// -------------------------------------------------------------
function renderTimeSlots() {
  const displayLabel = document.getElementById('selected-date-display');
  const slotsGrid = document.getElementById('slots-grid');
  slotsGrid.innerHTML = '';

  if (!state.selectedDate) {
    displayLabel.textContent = 'Selecione uma data no calendário';
    return;
  }

  const summary = getSelectedSummary();
  const [y, m, d] = state.selectedDate.split('-');
  const durationInfo = summary ? ` (Duração: ${summary.durationLabel})` : '';
  displayLabel.textContent = `Horários para ${d}/${m}/${y}${durationInfo}:`;

  const dayBookings = state.appointments.filter(a =>
    a.date === state.selectedDate &&
    (a.status === 'Confirmado' || a.status === 'Aguardando')
  );
  const dayBlocks = state.blockedTimes.filter(b => (b.block_date || b.blockDate) === state.selectedDate);

  const now = new Date();
  const isTodaySelected = state.selectedDate === formatDateISO(now);
  const currentMinutesOfDay = now.getHours() * 60 + now.getMinutes();

  let availableCount = 0;

  state.baseTimeSlots.forEach(time => {
    const slotMinutes = timeToMinutes(time);
    const serviceDuration = summary ? summary.durationMinutes : 60;
    const slotEndMinutes = slotMinutes + serviceDuration;

    // 1. No dia de hoje, esconder horários que já passaram (com 15 min de margem)
    if (isTodaySelected && slotMinutes <= currentMinutesOfDay + 15) {
      return;
    }

    // 2. Ultrapassa horário limite de encerramento (19:30 máximo para procedimentos longos)
    const isTooLate = slotEndMinutes > (19 * 60 + 30);

    // 3. Conflito com agendamentos existentes (usa endTime real do agendamento quando salvo)
    const isAppointmentConflict = dayBookings.some(booking => {
      const bStart = timeToMinutes(booking.time.slice(0, 5));
      let bEnd;
      if (booking.endTime) {
        bEnd = timeToMinutes(booking.endTime.slice(0, 5));
      } else {
        const bookingService = state.services.find(s => s.id === booking.serviceId);
        const bDuration = bookingService ? bookingService.durationMinutes : 90;
        bEnd = bStart + bDuration;
      }
      return slotMinutes < bEnd && slotEndMinutes > bStart;
    });

    // 4. Conflito com pausas/bloqueios parciais da Samara
    const isBlockedConflict = dayBlocks.some(block => {
      const startStr = block.start_time || block.startTime;
      const endStr = block.end_time || block.endTime;
      if (!startStr) return true; // Dia todo bloqueado
      const bStart = timeToMinutes(startStr.slice(0, 5));
      const bEnd = endStr ? timeToMinutes(endStr.slice(0, 5)) : (bStart + 60);
      return slotMinutes < bEnd && slotEndMinutes > bStart;
    });

    const isBooked = isAppointmentConflict || isBlockedConflict || isTooLate;
    const isSelected = state.selectedTimeSlot === time;

    if (!isBooked) availableCount++;

    const btn = document.createElement('button');
    btn.className = `slot-btn ${isSelected ? 'selected' : ''} ${isBooked ? 'booked' : ''}`;
    btn.textContent = time;
    btn.id = `slot-${time.replace(':', '-')}`;

    if (isBooked) {
      btn.title = isTooLate ? 'Tempo insuficiente antes do fechamento' : 'Horário indisponível';
      btn.disabled = true;
    } else {
      btn.addEventListener('click', () => {
        state.selectedTimeSlot = time;
        renderTimeSlots();
        updateSummary();
        // Rolar suavemente para o Passo 3 (Seus Dados e Confirmação)
        const step3 = document.getElementById('checkout-section');
        if (step3) {
          setTimeout(() => {
            step3.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 120);
        }
      });
    }

    slotsGrid.appendChild(btn);
  });

  if (slotsGrid.children.length === 0 || availableCount === 0) {
    const msg = document.createElement('p');
    msg.style.cssText = 'grid-column: 1/-1; color: var(--primary-rose-light); font-size: 13px; text-align: center; padding: 14px 8px;';
    msg.textContent = isTodaySelected
      ? 'Não há mais horários disponíveis para hoje com essa duração. Selecione outro dia no calendário!'
      : 'Todos os horários deste dia já estão preenchidos para essa duração. Escolha outra data!';
    slotsGrid.appendChild(msg);
  }
}

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(totalMinutes) {
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const m = String(totalMinutes % 60).padStart(2, '0');
  return `${h}:${m}`;
}

// -------------------------------------------------------------
// RESUMO, DESBLOQUEIO DE PASSOS E BARRA FLUTUANTE
// -------------------------------------------------------------
function updateSummary() {
  const summaryService = document.getElementById('summary-service');
  const summaryDuration = document.getElementById('summary-duration');
  const summaryDate = document.getElementById('summary-date');
  const summaryTime = document.getElementById('summary-time');
  const summaryPrice = document.getElementById('summary-price');
  const confirmBtn = document.getElementById('confirm-booking-btn');

  const summary = getSelectedSummary();
  state.selectedService = summary;

  if (summary) {
    summaryService.textContent = summary.title;
    summaryDuration.textContent = summary.durationLabel;
    summaryPrice.textContent = `R$ ${summary.price.toFixed(2).replace('.', ',')}`;
  } else {
    summaryService.textContent = 'Nenhum selecionado';
    summaryDuration.textContent = '-';
    summaryPrice.textContent = 'R$ 0,00';
  }

  if (state.selectedDate) {
    const [y, m, d] = state.selectedDate.split('-');
    summaryDate.textContent = `${d}/${m}/${y}`;
  } else {
    summaryDate.textContent = '-';
  }

  if (state.selectedTimeSlot && summary) {
    const startMin = timeToMinutes(state.selectedTimeSlot);
    const endMin = startMin + summary.durationMinutes;
    summaryTime.textContent = `${state.selectedTimeSlot}h às ${minutesToTime(endMin)}h`;
  } else {
    summaryTime.textContent = state.selectedTimeSlot ? `${state.selectedTimeSlot}h` : '-';
  }

  const isValid = Boolean(summary && state.selectedDate && state.selectedTimeSlot);
  confirmBtn.disabled = !isValid;

  updateStepLocksAndFloatingBar(summary);
}

function updateStepLocksAndFloatingBar(summary) {
  const step2Section = document.getElementById('datetime-section');
  const step3Section = document.getElementById('checkout-section');
  const stepInd1 = document.getElementById('step-ind-1');
  const stepInd2 = document.getElementById('step-ind-2');
  const floatingBar = document.getElementById('floating-booking-bar');
  const floatingTitle = document.getElementById('floating-bar-title');
  const floatingMeta = document.getElementById('floating-bar-meta');
  const floatingBtn = document.getElementById('floating-bar-btn');

  const hasService = Boolean(summary);
  const hasDateTime = Boolean(summary && state.selectedDate && state.selectedTimeSlot);

  if (stepInd1) {
    stepInd1.classList.toggle('completed', hasService);
    stepInd1.textContent = hasService ? '✓' : '1';
  }

  if (step2Section) {
    step2Section.classList.toggle('step-locked', !hasService);
  }

  if (stepInd2) {
    stepInd2.classList.toggle('completed', hasDateTime);
    stepInd2.textContent = hasDateTime ? '✓' : '2';
  }

  if (step3Section) {
    step3Section.classList.toggle('step-locked', !hasDateTime);
  }

  if (floatingBar && floatingTitle && floatingMeta && floatingBtn) {
    if (!hasService || state.isAdminView) {
      floatingBar.classList.remove('visible');
    } else {
      floatingBar.classList.add('visible');
      floatingTitle.textContent = summary.title;
      if (!hasDateTime) {
        floatingMeta.textContent = `⏱️ ${summary.durationLabel} • R$ ${summary.price.toFixed(2).replace('.', ',')}`;
        floatingBtn.textContent = 'Escolher Horário ↓';
      } else {
        const [y, m, d] = state.selectedDate.split('-');
        floatingMeta.textContent = `📅 ${d}/${m} às ${state.selectedTimeSlot}h • R$ ${summary.price.toFixed(2).replace('.', ',')}`;
        floatingBtn.textContent = 'Finalizar Reserva ↓';
      }
    }
  }
}

// -------------------------------------------------------------
// CONFIRMAÇÃO DO AGENDAMENTO COM PERSISTÊNCIA EM NUVEM
// -------------------------------------------------------------
async function confirmBooking() {
  const nameInput = document.getElementById('client-name');
  const phoneInput = document.getElementById('client-phone');
  const notesInput = document.getElementById('client-notes');

  const name = nameInput.value.trim();
  const rawPhone = phoneInput.value.trim();
  const phoneDigits = rawPhone.replace(/\D/g, '');

  if (!name) {
    showToast('⚠️ Por favor, informe seu nome completo.');
    nameInput.focus();
    return;
  }

  if (phoneDigits.length < 10) {
    showToast('⚠️ Informe um WhatsApp válido com DDD (ex: 27 99999-9999).');
    phoneInput.focus();
    return;
  }

  const formattedPhone = formatPhoneMask(phoneDigits);
  const summary = getSelectedSummary();
  if (!summary) {
    showToast('⚠️ Selecione pelo menos 1 procedimento.');
    return;
  }

  // Salvar dados da cliente no aparelho para próximas visitas
  localStorage.setItem(STORAGE_SAVED_CLIENT, JSON.stringify({
    name: name,
    phone: formattedPhone
  }));
  const savedNotice = document.getElementById('saved-client-notice');
  if (savedNotice) savedNotice.style.display = 'flex';

  const startMin = timeToMinutes(state.selectedTimeSlot);
  const endMin = startMin + summary.durationMinutes;
  const calculatedEndTime = minutesToTime(endMin);

  const initialStatus = state.studioConfig.defaultSheetStatus || 'Aguardando';

  const newAppointment = {
    id: 'apt-' + Date.now().toString().slice(-6),
    clientName: name,
    clientPhone: formattedPhone,
    serviceId: summary.id,
    serviceTitle: summary.title,
    durationMinutes: summary.durationMinutes,
    durationLabel: summary.durationLabel,
    date: state.selectedDate,
    time: state.selectedTimeSlot,
    endTime: calculatedEndTime,
    price: summary.price,
    notes: notesInput.value.trim(),
    status: initialStatus,
    createdAt: new Date().toISOString()
  };

  await saveNewAppointment(newAppointment);
  state.lastConfirmedBooking = newAppointment;

  openSuccessModal(newAppointment);

  notesInput.value = '';
  state.selectedServices = [];
  state.selectedService = null;
  state.selectedTimeSlot = null;
  renderServices();
  renderTimeSlots();
  updateSummary();

  if (state.isAdminView) {
    renderAdminAppointments();
  }
}

// -------------------------------------------------------------
// MODAL DE SUCESSO, WHATSAPP & GOOGLE AGENDA
// -------------------------------------------------------------
function openSuccessModal(booking) {
  const modal = document.getElementById('success-modal');
  const ticketDetails = document.getElementById('modal-ticket-details');
  const [y, m, d] = booking.date.split('-');
  const service = state.services.find(s => s.id === booking.serviceId);
  const durationLabel = booking.durationLabel || (service ? service.durationLabel : 'Tempo estimado');

  ticketDetails.innerHTML = `
    <div class="modal-ticket-item">
      <span>Código do Agendamento:</span>
      <span>#${booking.id}</span>
    </div>
    <div class="modal-ticket-item">
      <span>Cliente:</span>
      <span>${booking.clientName}</span>
    </div>
    <div class="modal-ticket-item">
      <span>Procedimento(s):</span>
      <span>${booking.serviceTitle}</span>
    </div>
    <div class="modal-ticket-item">
      <span>Duração Estimada:</span>
      <span>${durationLabel}</span>
    </div>
    <div class="modal-ticket-item">
      <span>Data & Horário:</span>
      <span>${d}/${m}/${y} • ${booking.time}h às ${booking.endTime || '-'}h</span>
    </div>
    <div class="modal-ticket-item">
      <span>Valor a Pagar:</span>
      <span>R$ ${booking.price.toFixed(2).replace('.', ',')}</span>
    </div>
    <div class="modal-ticket-item">
      <span>Pagamento:</span>
      <span style="color: var(--accent-green);">Presencial no Studio</span>
    </div>
    <div class="modal-ticket-item">
      <span>Endereço:</span>
      <span style="color: var(--primary-rose-light); font-size: 12.5px;">${state.studioConfig.address}</span>
    </div>
  `;

  modal.classList.add('active');
}

function sendWhatsAppMessage() {
  if (!state.lastConfirmedBooking) return;
  const b = state.lastConfirmedBooking;
  const [y, m, d] = b.date.split('-');
  const service = state.services.find(s => s.id === b.serviceId);
  const durLabel = b.durationLabel || (service ? service.durationLabel : '');

  const msg = `✨ *Olá Samara! Novo agendamento realizado no site:*%0A%0A` +
    `👤 *Cliente:* ${encodeURIComponent(b.clientName)}%0A` +
    `💅 *Procedimento(s):* ${encodeURIComponent(b.serviceTitle)}%0A` +
    (durLabel ? `⏱️ *Duração:* ${encodeURIComponent(durLabel)}%0A` : '') +
    `📅 *Data:* ${d}/${m}/${y}%0A` +
    `⏰ *Horário:* ${b.time}h às ${b.endTime || ''}h%0A` +
    `💰 *Valor:* R$ ${b.price.toFixed(2).replace('.', ',')}%0A` +
    `📍 *Local:* ${encodeURIComponent(state.studioConfig.address || 'Rua Nossa Senhora das Graças, Santo Antônio, Cariacica')}%0A` +
    `💳 *Pagamento:* Presencial no Studio%0A` +
    (b.notes ? `📝 *Observação:* ${encodeURIComponent(b.notes)}%0A` : '') +
    `%0A_Aguardando sua confirmação!_`;

  const phone = state.studioConfig.whatsapp || '5527988459016';
  const url = `https://wa.me/${phone}?text=${msg}`;
  window.open(url, '_blank');
}

function addToGoogleCalendar() {
  if (!state.lastConfirmedBooking) return;
  const b = state.lastConfirmedBooking;
  const [y, m, d] = b.date.split('-');
  const [hh, mm] = b.time.split(':');

  const service = state.services.find(s => s.id === b.serviceId);
  const durationMin = b.durationMinutes || (service ? service.durationMinutes : 120);

  const startMinutes = Number(hh) * 60 + Number(mm);
  const endMinutes = startMinutes + durationMin;
  const endH = String(Math.floor(endMinutes / 60)).padStart(2, '0');
  const endM = String(endMinutes % 60).padStart(2, '0');

  const startStr = `${y}${m}${d}T${hh}${mm}00`;
  const endStr = `${y}${m}${d}T${endH}${endM}00`;

  const title = encodeURIComponent(`${b.serviceTitle} • Samara Studio`);
  const details = encodeURIComponent(`Agendamento de ${b.serviceTitle} com Samara.\nCódigo: #${b.id}\nValor: R$ ${b.price.toFixed(2)} (Pagamento no local)`);
  const location = encodeURIComponent(state.studioConfig.address || 'Rua Nossa Senhora das Graças, Santo Antônio, Cariacica');

  const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&location=${location}`;
  window.open(gCalUrl, '_blank');
}

// -------------------------------------------------------------
// CONTROLE DE PIN DE SEGURANÇA E ADMIN
// -------------------------------------------------------------
function handleAdminToggleClick() {
  if (state.isAdminView) {
    exitAdminView();
  } else {
    if (state.isAdminAuthenticated) {
      enterAdminView();
    } else {
      openPinModal();
    }
  }
}

function openPinModal() {
  state.pinInput = '';
  updatePinDisplay();
  document.getElementById('pin-modal').classList.add('active');
}

function closePinModal() {
  document.getElementById('pin-modal').classList.remove('active');
  state.pinInput = '';
}

function updatePinDisplay() {
  const dots = document.querySelectorAll('.pin-dot');
  dots.forEach((dot, index) => {
    if (index < state.pinInput.length) {
      dot.classList.add('filled');
    } else {
      dot.classList.remove('filled');
    }
  });
}

function handleKeypadPress(key) {
  if (key === 'clear') {
    state.pinInput = '';
  } else if (key === 'del') {
    state.pinInput = state.pinInput.slice(0, -1);
  } else if (state.pinInput.length < 4) {
    state.pinInput += key;
  }

  updatePinDisplay();

  if (state.pinInput.length === 4) {
    setTimeout(verifyPin, 150);
  }
}

function verifyPin() {
  const correctPin = state.studioConfig.pin || '1234';
  if (state.pinInput === correctPin) {
    state.isAdminAuthenticated = true;
    closePinModal();
    enterAdminView();
    showToast('✓ Acesso autorizado ao Painel Samara!');
  } else {
    showToast('❌ PIN incorreto. Tente novamente.');
    state.pinInput = '';
    updatePinDisplay();
  }
}

function enterAdminView() {
  state.isAdminView = true;
  document.getElementById('client-view').classList.remove('active');
  document.getElementById('admin-view').classList.add('active');
  document.getElementById('view-mode-label').textContent = 'Ver Modo Cliente';
  updateSummary();
  renderAdminAppointments();
}

function exitAdminView() {
  state.isAdminView = false;
  document.getElementById('admin-view').classList.remove('active');
  document.getElementById('client-view').classList.add('active');
  document.getElementById('view-mode-label').textContent = 'Painel Admin';
  renderServices();
  renderTimeSlots();
  updateSummary();
}

// -------------------------------------------------------------
// RENDERIZAÇÃO DO PAINEL ADMIN
// -------------------------------------------------------------
  state.adminDateFilter = 'all';

function renderAdminAppointments() {
  const list = document.getElementById('admin-appointments-list');
  const metricToday = document.getElementById('metric-today-count');
  const metricActive = document.getElementById('metric-total-active');
  const metricRevenue = document.getElementById('metric-projected-revenue');

  list.innerHTML = '';

  const todayStr = formatDateISO(new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatDateISO(tomorrow);

  const totalToday = state.appointments.filter(a => a.date === todayStr && (a.status === 'Confirmado' || a.status === 'Aguardando')).length;
  const totalActive = state.appointments.filter(a => a.status === 'Confirmado' || a.status === 'Aguardando').length;
  const projectedRevenue = state.appointments
    .filter(a => a.status === 'Confirmado' || a.status === 'Concluído' || a.status === 'Aguardando')
    .reduce((sum, a) => sum + (a.price || 0), 0);

  metricToday.textContent = totalToday;
  metricActive.textContent = totalActive;
  metricRevenue.textContent = `R$ ${projectedRevenue.toFixed(2).replace('.', ',')}`;

  // Filtragem por status e por data
  let filtered = state.appointments;
  if (state.adminFilter !== 'all') {
    filtered = filtered.filter(a => a.status === state.adminFilter);
  }
  if (state.adminDateFilter === 'today') {
    filtered = filtered.filter(a => a.date === todayStr);
  } else if (state.adminDateFilter === 'tomorrow') {
    filtered = filtered.filter(a => a.date === tomorrowStr);
  }

  if (filtered.length === 0) {
    list.innerHTML = `<p style="text-align: center; color: var(--text-faint); padding: 32px;">Nenhum agendamento encontrado para este filtro.</p>`;
    return;
  }

  filtered.forEach(item => {
    const [y, m, d] = item.date.split('-');
    const cols = formatAppointmentForSheetColumns(item);
    const card = document.createElement('div');
    card.className = 'appointment-item';

    const sheetBadge = item.source === 'google_sheets'
      ? `<span class="sheet-source-badge" title="Sincronizado com a Planilha Google">📗 Planilha</span>`
      : '';

    card.innerHTML = `
      <div class="appt-client-info">
        <span class="appt-name">${item.clientName}${sheetBadge}</span>
        <span class="appt-phone">📞 ${item.clientPhone}</span>
      </div>
      <div class="appt-service-info">
        <span class="appt-service-title">${cols.arte}</span>
        <span class="appt-datetime">📅 Dia ${cols.dia} (${cols.dataSemana}) • ${d}/${m}/${y} • ${item.time}h às ${item.endTime || '-'}h • R$ ${Number(item.price || 0).toFixed(2).replace('.', ',')}</span>
      </div>
      <div>
        <span class="appt-status-badge ${(item.status || 'Confirmado').toLowerCase()}">${item.status}</span>
      </div>
      <div class="appt-actions">
        <button class="appt-btn whatsapp" onclick="sendClientReminder('${item.id}')" title="Enviar lembrete pelo WhatsApp">💬 Lembrete</button>
        ${item.status === 'Aguardando' ? `
          <button class="appt-btn confirm-action" onclick="updateAppointmentStatus('${item.id}', 'Confirmado')">✓ Confirmar</button>
          <button class="appt-btn danger" onclick="updateAppointmentStatus('${item.id}', 'Cancelado')">Cancelar</button>
        ` : item.status === 'Confirmado' ? `
          <button class="appt-btn" onclick="updateAppointmentStatus('${item.id}', 'Concluído')">Concluir</button>
          <button class="appt-btn danger" onclick="updateAppointmentStatus('${item.id}', 'Cancelado')">Cancelar</button>
        ` : `
          <button class="appt-btn" onclick="deleteAppointment('${item.id}')">Excluir</button>
        `}
      </div>
    `;

    list.appendChild(card);
  });
}

// Enviar Lembrete no WhatsApp da Cliente
window.sendClientReminder = function(apptId) {
  const item = state.appointments.find(a => a.id === apptId);
  if (!item) return;

  const [y, m, d] = item.date.split('-');
  const cleanPhone = item.clientPhone.replace(/\D/g, '');
  const phoneTarget = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

  const msg = `✨ *Olá ${item.clientName}!* Tudo bem?%0A%0A` +
    `Passando para confirmar seu horário no *Studio Samara:*%0A` +
    `💅 *Procedimento:* ${encodeURIComponent(item.serviceTitle)}%0A` +
    `📅 *Data:* ${d}/${m}/${y}%0A` +
    `⏰ *Horário:* ${item.time}h às ${item.endTime || '-'}h%0A` +
    `💰 *Valor:* R$ ${item.price.toFixed(2).replace('.', ',')}%0A` +
    `📍 *Local:* ${encodeURIComponent(state.studioConfig.address || 'Studio Samara')}%0A%0A` +
    `_Nos vemos lá! Caso precise remarcar, por favor nos avise._`;

  window.open(`https://wa.me/${phoneTarget}?text=${msg}`, '_blank');
};

// -------------------------------------------------------------
// GESTÃO DE SERVIÇOS & PREÇOS (ABA 2 DO ADMIN)
// -------------------------------------------------------------
function renderAdminServices() {
  const container = document.getElementById('admin-services-list');
  if (!container) return;
  container.innerHTML = '';

  state.services.forEach(srv => {
    const row = document.createElement('div');
    row.className = 'admin-service-row';

    row.innerHTML = `
      <div class="admin-srv-info">
        <span style="font-size: 20px;">${srv.icon}</span>
        <div>
          <div class="admin-srv-title">${srv.title}</div>
          <div class="admin-srv-category">⏱️ ${srv.durationLabel} • Cat: ${srv.category}</div>
        </div>
      </div>
      <div class="admin-srv-edit">
        <span style="font-size: 13px; color: var(--text-muted);">R$</span>
        <input type="number" step="5" class="admin-price-input" id="price-input-${srv.id}" value="${srv.price}">
        <button class="appt-btn" onclick="saveServicePrice('${srv.id}')">Salvar</button>
      </div>
    `;

    container.appendChild(row);
  });
}

window.saveServicePrice = async function(serviceId) {
  const input = document.getElementById(`price-input-${serviceId}`);
  if (!input) return;
  const newPrice = parseFloat(input.value);

  if (isNaN(newPrice) || newPrice < 0) {
    showToast('⚠️ Preço inválido.');
    return;
  }

  const srv = state.services.find(s => s.id === serviceId);
  if (srv) {
    srv.price = newPrice;
    renderServices();
    updateSummary();

    if (supabaseClient) {
      const { error } = await supabaseClient
        .from('services')
        .update({ price: newPrice })
        .eq('id', serviceId);

      if (error) {
        showToast('⚠️ Erro ao atualizar no Supabase');
      } else {
        showToast(`✓ Preço de "${srv.title}" atualizado para R$ ${newPrice.toFixed(2).replace('.', ',')} no Supabase!`);
      }
    } else {
      showToast('✓ Preço atualizado localmente!');
    }
  }
};

// -------------------------------------------------------------
// GESTÃO DE BLOQUEIOS & FOLGAS (ABA 3 DO ADMIN)
// -------------------------------------------------------------
function renderAdminBlocks() {
  const list = document.getElementById('admin-blocks-list');
  if (!list) return;
  list.innerHTML = '';

  if (state.blockedTimes.length === 0) {
    list.innerHTML = `<p style="color: var(--text-faint); font-size: 13px;">Nenhum bloqueio cadastrado. A agenda segue o horário normal.</p>`;
    return;
  }

  state.blockedTimes.forEach(block => {
    const [y, m, d] = block.block_date.split('-');
    const timeText = block.start_time ? `${block.start_time.slice(0,5)} às ${block.end_time ? block.end_time.slice(0,5) : '18:30'}` : 'Dia Inteiro Fechado';

    const item = document.createElement('div');
    item.className = 'block-item';
    item.innerHTML = `
      <div class="block-item-info">
        <span class="block-item-date">📅 ${d}/${m}/${y} • ${timeText}</span>
        <span class="block-item-reason">🚫 Motivo: ${block.reason}</span>
      </div>
      <button class="appt-btn danger" onclick="deleteBlock('${block.id}')">Remover</button>
    `;
    list.appendChild(item);
  });
}

window.deleteBlock = async function(blockId) {
  state.blockedTimes = state.blockedTimes.filter(b => b.id !== blockId);
  renderAdminBlocks();
  renderCalendar();
  renderTimeSlots();

  if (supabaseClient) {
    await supabaseClient.from('blocked_times').delete().eq('id', blockId);
  }
  showToast('✓ Bloqueio removido da agenda!');
};

async function handleAddBlock() {
  const dateInput = document.getElementById('block-date-input');
  const startInput = document.getElementById('block-start-input');
  const endInput = document.getElementById('block-end-input');
  const reasonInput = document.getElementById('block-reason-input');

  const blockDate = dateInput.value;
  const reason = reasonInput.value.trim() || 'Indisponível';

  if (!blockDate) {
    showToast('⚠️ Selecione a data do bloqueio.');
    dateInput.focus();
    return;
  }

  const newBlock = {
    id: 'blk-' + Date.now().toString().slice(-6),
    block_date: blockDate,
    start_time: startInput.value || null,
    end_time: endInput.value || null,
    reason: reason
  };

  state.blockedTimes.push(newBlock);
  renderAdminBlocks();
  renderCalendar();
  renderTimeSlots();

  if (supabaseClient) {
    try {
      await supabaseClient.from('blocked_times').insert([newBlock]);
      showToast('✓ Horário bloqueado no Supabase com sucesso!');
    } catch (e) {
      console.warn('Erro ao salvar blocked_times no Supabase:', e);
    }
  }

  // Limpar formulário
  dateInput.value = '';
  startInput.value = '';
  endInput.value = '';
  reasonInput.value = '';
}

// -------------------------------------------------------------
// GESTÃO DE CLIENTES (ABA 4 DO ADMIN)
// -------------------------------------------------------------
function renderAdminClients() {
  const container = document.getElementById('admin-clients-list');
  if (!container) return;
  container.innerHTML = '';

  let list = state.clients;
  if (state.clientSearchQuery) {
    const q = state.clientSearchQuery.toLowerCase();
    list = list.filter(c => 
      c.name.toLowerCase().includes(q) || 
      (c.phone && c.phone.includes(q))
    );
  }

  if (list.length === 0) {
    container.innerHTML = `<p style="color: var(--text-faint); text-align: center; padding: 32px;">Nenhuma cliente encontrada.</p>`;
    return;
  }

  list.forEach(client => {
    // Calcular atendimentos e faturamento gerado pela cliente
    const clientAppts = state.appointments.filter(a => a.clientPhone === client.phone);
    const visits = clientAppts.length;
    const totalSpent = clientAppts
      .filter(a => a.status === 'Confirmado' || a.status === 'Concluído')
      .reduce((sum, a) => sum + (a.price || 0), 0);

    const cleanPhone = client.phone.replace(/\D/g, '');
    const phoneTarget = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

    const item = document.createElement('div');
    item.className = 'client-item';
    item.innerHTML = `
      <div class="client-item-info">
        <div class="client-item-name">👤 ${client.name}</div>
        <div class="client-item-details">
          📞 ${client.phone} • 📅 ${visits} visita(s) • 💰 R$ ${totalSpent.toFixed(2).replace('.', ',')} em atendimentos
        </div>
        ${client.notes ? `<div style="font-size: 11.5px; color: var(--primary-rose-light); margin-top: 4px;">📝 ${client.notes}</div>` : ''}
      </div>
      <div>
        <a href="https://wa.me/${phoneTarget}" target="_blank" class="appt-btn whatsapp" style="text-decoration: none;">💬 Conversar</a>
      </div>
    `;
    container.appendChild(item);
  });
}

// -------------------------------------------------------------
// EXPORTAÇÃO DE RELATÓRIO NO FORMATO EXATO DA PLANILHA DA SAMARA (COLUNAS A-G)
// -------------------------------------------------------------
function exportAppointmentsCSV() {
  if (state.appointments.length === 0) {
    showToast('⚠️ Nenhum agendamento para exportar.');
    return;
  }

  // Cabeçalho idêntico às colunas A até G da Planilha da Samara: [Dia, Data, Cliente, Horário, Arte, Valor, Status]
  let csvContent = ';Data;Cliente;Horário;Arte;Valor;Status;WhatsApp\n';

  state.appointments.forEach(a => {
    const cols = formatAppointmentForSheetColumns(a);
    const row = [
      cols.dia,
      cols.dataSemana,
      `"${(cols.cliente || '').replace(/"/g, '""')}"`,
      cols.horario,
      `"${(cols.arte || '').replace(/"/g, '""')}"`,
      cols.valor,
      cols.status,
      `"${a.clientPhone || ''}"`
    ];
    csvContent += row.join(';') + '\n';
  });

  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `planilha_samara_${formatDateISO(new Date())}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('✓ Planilha gerada com as colunas exatas da Samara (Dia, Data, Cliente, Horário, Arte, Valor, Status)!');
}

// -------------------------------------------------------------
// EVENT LISTENERS GERAIS
// -------------------------------------------------------------
function setupEventListeners() {
  document.getElementById('toggle-admin-btn').addEventListener('click', handleAdminToggleClick);

  // Barra de Busca Rápida de Serviços
  const searchInput = document.getElementById('service-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.serviceSearchQuery = e.target.value.trim();
      renderServices();
    });
  }

  // Barra de Busca de Clientes no Admin
  const clientSearchInput = document.getElementById('client-search-input');
  if (clientSearchInput) {
    clientSearchInput.addEventListener('input', (e) => {
      state.clientSearchQuery = e.target.value.trim();
      renderAdminClients();
    });
  }

  // Botão Exportar CSV
  const exportBtn = document.getElementById('btn-export-csv');
  if (exportBtn) exportBtn.addEventListener('click', exportAppointmentsCSV);

  // Alternância das 5 Abas do Admin
  const tabAgenda = document.getElementById('tab-btn-agenda');
  const tabServices = document.getElementById('tab-btn-services');
  const tabBlocks = document.getElementById('tab-btn-blocks');
  const tabClients = document.getElementById('tab-btn-clients');
  const tabConfig = document.getElementById('tab-btn-config');

  const contentAgenda = document.getElementById('admin-content-agenda');
  const contentServices = document.getElementById('admin-content-services');
  const contentBlocks = document.getElementById('admin-content-blocks');
  const contentClients = document.getElementById('admin-content-clients');
  const contentConfig = document.getElementById('admin-content-config');

  function resetAdminTabs() {
    [tabAgenda, tabServices, tabBlocks, tabClients, tabConfig].forEach(t => t && t.classList.remove('active'));
    [contentAgenda, contentServices, contentBlocks, contentClients, contentConfig].forEach(c => c && c.classList.remove('active'));
  }

  if (tabAgenda) tabAgenda.addEventListener('click', () => {
    resetAdminTabs();
    tabAgenda.classList.add('active');
    contentAgenda.classList.add('active');
    renderAdminAppointments();
  });

  if (tabServices) tabServices.addEventListener('click', () => {
    resetAdminTabs();
    tabServices.classList.add('active');
    contentServices.classList.add('active');
    renderAdminServices();
  });

  if (tabBlocks) tabBlocks.addEventListener('click', () => {
    resetAdminTabs();
    tabBlocks.classList.add('active');
    contentBlocks.classList.add('active');
    renderAdminBlocks();
  });

  if (tabClients) tabClients.addEventListener('click', async () => {
    resetAdminTabs();
    tabClients.classList.add('active');
    contentClients.classList.add('active');
    await loadClientsFromSupabase();
    renderAdminClients();
  });

  if (tabConfig) tabConfig.addEventListener('click', () => {
    resetAdminTabs();
    tabConfig.classList.add('active');
    contentConfig.classList.add('active');
  });

  const saveBlockBtn = document.getElementById('btn-save-block');
  if (saveBlockBtn) saveBlockBtn.addEventListener('click', handleAddBlock);

  const saveCfgBtn = document.getElementById('btn-save-config');
  if (saveCfgBtn) saveCfgBtn.addEventListener('click', saveStudioConfig);

  const testSheetsBtn = document.getElementById('btn-test-sheets-sync');
  if (testSheetsBtn) {
    testSheetsBtn.addEventListener('click', async () => {
      saveStudioConfig();
      const ok = await syncFromGoogleSheets();
      renderAdminAppointments();
      renderTimeSlots();
      if (ok) {
        showToast('✓ Sincronizado ao vivo com a Planilha Google da Samara!');
      } else {
        showToast('📗 Agenda de Novembro 2026 ativa! Cole a URL do Apps Script acima para sincronizar em tempo real.');
      }
    });
  }

  const copyScriptBtn = document.getElementById('btn-copy-apps-script');
  if (copyScriptBtn) {
    copyScriptBtn.addEventListener('click', async () => {
      try {
        const res = await fetch('./google-sheets-script.gs');
        const scriptText = await res.text();
        await navigator.clipboard.writeText(scriptText);
        showToast('✓ Código copiado! Agora cole em Extensões -> Apps Script na Planilha da Samara.');
      } catch (err) {
        showToast('⚠️ Abra o arquivo google-sheets-script.gs para copiar o código.');
      }
    });
  }

  const refreshBtn = document.getElementById('btn-refresh-agenda');
  if (refreshBtn) refreshBtn.addEventListener('click', async () => {
    await loadAppointments();
    await syncFromGoogleSheets();
    await loadBlockedTimes();
    await loadServicesFromSupabase();
    await loadClientsFromSupabase();
    renderAdminAppointments();
    renderAdminServices();
    renderAdminBlocks();
    renderAdminClients();
    renderTimeSlots();
    showToast('✓ Agenda sincronizada com Supabase e Planilha da Samara!');
  });

  const keyBtns = document.querySelectorAll('.key-btn');
  keyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      handleKeypadPress(btn.dataset.key);
    });
  });

  document.getElementById('close-pin-modal-btn').addEventListener('click', closePinModal);

  const filterChips = document.querySelectorAll('.filter-chip');
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.activeCategory = chip.dataset.category;
      renderServices();
      const grid = document.getElementById('services-grid');
      if (grid) grid.scrollTo({ left: 0, behavior: 'smooth' });
    });
  });

  // Alternar entre Ideia A (9 Serviços + Combos Automáticos) e Ideia B (Carrossel por Categorias)
  const modeBtns = document.querySelectorAll('.layout-mode-btn');
  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.layoutMode = btn.dataset.mode;
      renderServices();
      const grid = document.getElementById('services-grid');
      if (grid) grid.scrollTo({ left: 0, behavior: 'smooth' });
      showToast(state.layoutMode === 'idea-a'
        ? '🌟 Testando Ideia A: 9 Serviços com Foto (Combos automáticos)'
        : '🗂️ Testando Ideia B: Carrossel dividido por Categorias');
    });
  });

  // Setas e Indicador de Scroll do Carrossel
  const carouselGrid = document.getElementById('services-grid');
  const prevCarouselBtn = document.getElementById('carousel-prev-btn');
  const nextCarouselBtn = document.getElementById('carousel-next-btn');

  if (prevCarouselBtn && carouselGrid) {
    prevCarouselBtn.addEventListener('click', () => {
      carouselGrid.scrollBy({ left: -318, behavior: 'smooth' });
    });
  }

  if (nextCarouselBtn && carouselGrid) {
    nextCarouselBtn.addEventListener('click', () => {
      carouselGrid.scrollBy({ left: 318, behavior: 'smooth' });
    });
  }

  if (carouselGrid) {
    carouselGrid.addEventListener('scroll', () => {
      const cards = Array.from(carouselGrid.children);
      if (cards.length === 0) return;
      const gridCenter = carouselGrid.scrollLeft + carouselGrid.clientWidth / 2;
      let closestIdx = 0;
      let minDistance = Infinity;

      cards.forEach((card, idx) => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const dist = Math.abs(gridCenter - cardCenter);
        if (dist < minDistance) {
          minDistance = dist;
          closestIdx = idx;
        }
      });

      const counterEl = document.getElementById('carousel-counter');
      if (counterEl) {
        counterEl.textContent = `${closestIdx + 1} / ${cards.length}`;
      }

      const dots = document.querySelectorAll('.carousel-dot');
      dots.forEach((dot, idx) => {
        dot.classList.toggle('active', idx === closestIdx);
      });
    }, { passive: true });
  }

  // Alternar Posição do Atendimento/Endereço no Card do Topo (Opção 1 vs Opção 2)
  const headerChips = document.querySelectorAll('[data-header-layout]');
  headerChips.forEach(chip => {
    chip.addEventListener('click', () => {
      headerChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const layoutChoice = chip.dataset.headerLayout;
      const appHeader = document.getElementById('app-header');
      if (appHeader) {
        appHeader.setAttribute('data-header-style', layoutChoice);
      }
      showToast(`✨ Visual aplicado: ${chip.textContent.trim()}`);
    });
  });

  document.getElementById('prev-month-btn').addEventListener('click', () => {
    state.currentCalendarDate.setMonth(state.currentCalendarDate.getMonth() - 1);
    renderCalendar();
  });

  document.getElementById('next-month-btn').addEventListener('click', () => {
    state.currentCalendarDate.setMonth(state.currentCalendarDate.getMonth() + 1);
    renderCalendar();
  });

  document.getElementById('confirm-booking-btn').addEventListener('click', confirmBooking);
  document.getElementById('whatsapp-confirm-btn').addEventListener('click', sendWhatsAppMessage);
  document.getElementById('calendar-add-btn').addEventListener('click', addToGoogleCalendar);
  document.getElementById('close-modal-btn').addEventListener('click', () => {
    document.getElementById('success-modal').classList.remove('active');
  });

  // Botões da Barra de Múltiplos Procedimentos e Barra Flutuante
  const clearServicesBtn = document.getElementById('clear-services-btn');
  if (clearServicesBtn) {
    clearServicesBtn.addEventListener('click', clearSelectedServices);
  }

  const gotoStep2Btn = document.getElementById('goto-step2-btn');
  if (gotoStep2Btn) {
    gotoStep2Btn.addEventListener('click', () => {
      const step2 = document.getElementById('datetime-section');
      if (step2) step2.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  const floatingBarBtn = document.getElementById('floating-bar-btn');
  if (floatingBarBtn) {
    floatingBarBtn.addEventListener('click', () => {
      if (!state.selectedTimeSlot) {
        const step2 = document.getElementById('datetime-section');
        if (step2) step2.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        const step3 = document.getElementById('checkout-section');
        if (step3) step3.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const nameInput = document.getElementById('client-name');
        if (nameInput && !nameInput.value) {
          setTimeout(() => nameInput.focus(), 400);
        }
      }
    });
  }

  // Máscara automática de WhatsApp e Limpar Dados Salvos
  const clientPhoneInput = document.getElementById('client-phone');
  if (clientPhoneInput) {
    clientPhoneInput.addEventListener('input', (e) => {
      e.target.value = formatPhoneMask(e.target.value);
    });
  }

  const manualPhoneInput = document.getElementById('manual-client-phone');
  if (manualPhoneInput) {
    manualPhoneInput.addEventListener('input', (e) => {
      e.target.value = formatPhoneMask(e.target.value);
    });
  }

  const clearSavedClientBtn = document.getElementById('clear-saved-client-btn');
  if (clearSavedClientBtn) {
    clearSavedClientBtn.addEventListener('click', clearSavedClientProfile);
  }

  const statusFilter = document.getElementById('admin-status-filter');
  if (statusFilter) statusFilter.addEventListener('change', (e) => {
    state.adminFilter = e.target.value;
    renderAdminAppointments();
  });

  const dateFilter = document.getElementById('admin-date-filter');
  if (dateFilter) dateFilter.addEventListener('change', (e) => {
    state.adminDateFilter = e.target.value;
    renderAdminAppointments();
  });

  // Event Listeners: Agendamento Manual (Admin)
  const openManualBtn = document.getElementById('btn-open-manual-booking');
  if (openManualBtn) openManualBtn.addEventListener('click', openManualBookingModal);

  const closeManualBtn = document.getElementById('close-manual-modal-btn');
  if (closeManualBtn) closeManualBtn.addEventListener('click', closeManualBookingModal);

  const cancelManualBtn = document.getElementById('cancel-manual-modal-btn');
  if (cancelManualBtn) cancelManualBtn.addEventListener('click', closeManualBookingModal);

  const manualForm = document.getElementById('manual-booking-form');
  if (manualForm) manualForm.addEventListener('submit', handleSaveManualBooking);

  // Event Listener: Botão Instalar PWA
  const installPwaBtn = document.getElementById('install-pwa-btn');
  if (installPwaBtn) {
    installPwaBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          showToast('✓ Aplicativo Samara Studio instalado!');
        }
        deferredPrompt = null;
        installPwaBtn.style.display = 'none';
      } else {
        showToast('Dica: no celular, clique em Compartilhar/Menu e "Adicionar à Tela de Início".');
      }
    });
  }
}

// -------------------------------------------------------------
// GESTÃO DE AGENDAMENTO MANUAL (ADMIN)
// -------------------------------------------------------------
function openManualBookingModal() {
  const modal = document.getElementById('manual-booking-modal');
  const serviceSelect = document.getElementById('manual-service-select');
  const dateInput = document.getElementById('manual-date-input');
  const timeInput = document.getElementById('manual-time-input');
  const feedback = document.getElementById('manual-booking-feedback');

  if (!modal || !serviceSelect) return;

  // Carregar opções de procedimentos reais da Samara
  serviceSelect.innerHTML = state.services.map(s => {
    const formattedPrice = parseFloat(s.price).toFixed(2).replace('.', ',');
    return `<option value="${s.id}">${s.title} (${s.durationLabel}) — R$ ${formattedPrice}</option>`;
  }).join('');

  // Sugerir data de hoje ou amanhã
  const today = new Date();
  dateInput.value = formatDateISO(today);
  dateInput.min = formatDateISO(today);
  timeInput.value = '09:00';

  if (feedback) {
    feedback.className = 'manual-feedback-text';
    feedback.style.display = 'none';
    feedback.textContent = '';
  }

  modal.classList.add('active');
}

function closeManualBookingModal() {
  const modal = document.getElementById('manual-booking-modal');
  if (modal) modal.classList.remove('active');
}

async function handleSaveManualBooking(e) {
  if (e) e.preventDefault();

  const nameInput = document.getElementById('manual-client-name');
  const phoneInput = document.getElementById('manual-client-phone');
  const serviceSelect = document.getElementById('manual-service-select');
  const dateInput = document.getElementById('manual-date-input');
  const timeInput = document.getElementById('manual-time-input');
  const notesInput = document.getElementById('manual-notes-input');

  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();
  const serviceId = serviceSelect.value;
  const date = dateInput.value;
  const time = timeInput.value;
  const notes = notesInput.value.trim();

  if (!name || !phone || !serviceId || !date || !time) {
    showManualFeedback('Por favor, preencha todos os campos com asterisco (*).', 'error');
    return;
  }

  // Validar se a data é domingo
  const selectedDateObj = new Date(date + 'T12:00:00');
  if (selectedDateObj.getDay() === 0) {
    showManualFeedback('O Studio Samara não abre aos domingos. Selecione de segunda a sábado.', 'error');
    return;
  }

  const service = state.services.find(s => s.id === serviceId);
  if (!service) {
    showManualFeedback('Procedimento selecionado inválido.', 'error');
    return;
  }

  // Calcular horário de término
  const [h, m] = time.split(':').map(Number);
  const startMin = h * 60 + m;
  const endMin = startMin + service.durationMinutes;
  const endH = Math.floor(endMin / 60);
  const endM = endMin % 60;
  const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

  // Validar conflito de horários com agendamentos existentes
  const conflict = state.appointments.find(a => {
    if (a.date !== date || a.status === 'Cancelado') return false;
    const [ah, am] = a.time.split(':').map(Number);
    const [eh, em] = a.endTime.split(':').map(Number);
    const aStart = ah * 60 + am;
    const aEnd = eh * 60 + em;
    return Math.max(startMin, aStart) < Math.min(endMin, aEnd);
  });

  if (conflict) {
    showManualFeedback(`⚠️ Conflito de horário! Já existe o agendamento de "${conflict.clientName}" (${conflict.serviceTitle}) das ${conflict.time} às ${conflict.endTime}.`, 'error');
    return;
  }

  // Validar se há bloqueio da Samara nessa data/horário
  const isBlocked = state.blockedTimes.some(b => {
    if (b.blockDate !== date) return false;
    if (!b.startTime && !b.endTime) return true;
    const [bh, bm] = b.startTime.split(':').map(Number);
    const [beh, bem] = b.endTime.split(':').map(Number);
    const bStart = bh * 60 + bm;
    const bEnd = beh * 60 + bem;
    return Math.max(startMin, bStart) < Math.min(endMin, bEnd);
  });

  if (isBlocked) {
    showManualFeedback('⚠️ Data ou horário bloqueado por folga/pausa da Samara.', 'error');
    return;
  }

  // Criar novo agendamento
  const newAppt = {
    id: 'apt-' + Math.floor(100000 + Math.random() * 900000),
    clientName: name,
    clientPhone: phone.replace(/\D/g, ''),
    serviceId: service.id,
    serviceTitle: service.title,
    date: date,
    time: time,
    endTime: endTime,
    price: service.price,
    notes: notes || 'Agendamento manual via painel',
    status: 'Confirmado',
    createdAt: new Date().toISOString()
  };

  showManualFeedback('Salvando agendamento no Supabase...', 'success');

  try {
    await saveNewAppointment(newAppt);
    await loadClientsFromSupabase();
    renderAdminAppointments();
    renderAdminClients();
    renderTimeSlots();
    closeManualBookingModal();
    showToast(`✓ Agendamento de ${name} inserido com sucesso!`);

    nameInput.value = '';
    phoneInput.value = '';
    notesInput.value = '';
  } catch (err) {
    showManualFeedback('Erro ao salvar no banco de dados: ' + err.message, 'error');
  }
}

function showManualFeedback(text, type) {
  const feedback = document.getElementById('manual-booking-feedback');
  if (!feedback) return;
  feedback.textContent = text;
  feedback.className = `manual-feedback-text ${type}`;
}

// -------------------------------------------------------------
// PWA INSTALLATION & SERVICE WORKER
// -------------------------------------------------------------
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const pwaBtn = document.getElementById('install-pwa-btn');
  if (pwaBtn) pwaBtn.style.display = 'inline-flex';
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      console.log('✓ Service Worker PWA registrado com sucesso:', reg.scope);
    }).catch((err) => {
      console.warn('Aviso Service Worker:', err);
    });
  });
}

function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function showToast(message) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}
