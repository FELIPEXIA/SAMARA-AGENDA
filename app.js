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

// Catálogo Base (Fallback e Inicialização)
const FALLBACK_SERVICES = [
  { id: 'srv-pe-mao', title: 'Pé e Mão', category: 'tradicional', price: 45, durationMinutes: 120, durationLabel: '2 horas', icon: '🌸' },
  { id: 'srv-pe', title: 'Pé', category: 'tradicional', price: 35, durationMinutes: 60, durationLabel: '1 hora', icon: '🦶' },
  { id: 'srv-mao', title: 'Mão', category: 'tradicional', price: 30, durationMinutes: 60, durationLabel: '1 hora', icon: '💅' },
  { id: 'srv-henna', title: 'Henna', category: 'sobrancelhas', price: 35, durationMinutes: 60, durationLabel: '1 hora', icon: '✨' },
  { id: 'srv-sobrancelhas', title: 'Sobrancelhas', category: 'sobrancelhas', price: 25, durationMinutes: 40, durationLabel: '40 minutos', icon: '👁️' },
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
  { id: 'srv-manutencao-henna', title: 'Manutenção e Henna', category: 'combos', price: 125, durationMinutes: 240, durationLabel: '4 horas', icon: '👑' }
];

// Estado da Aplicação
const state = {
  services: FALLBACK_SERVICES,
  selectedService: null,
  currentCalendarDate: new Date(),
  selectedDate: null,
  selectedTimeSlot: null,
  baseTimeSlots: ['08:30', '10:00', '11:30', '13:00', '14:30', '16:00', '17:00'],
  appointments: [],
  blockedTimes: [],
  serviceSearchQuery: '',
  clients: [],
  clientSearchQuery: '',
  activeCategory: 'all',
  adminFilter: 'all',
  isAdminView: false,
  isAdminAuthenticated: false,
  pinInput: '',
  studioConfig: {
    name: 'Samara Agendamento',
    whatsapp: '5527988459016',
    address: 'Rua Nossa Senhora das Graças, Santo Antônio, Cariacica',
    pin: '1234'
  },
  lastConfirmedBooking: null
};

const STORAGE_APPTS = 'samara_appts_official';
const STORAGE_CONFIG = 'samara_studio_config';

// Inicialização Geral
document.addEventListener('DOMContentLoaded', async () => {
  loadStudioConfig();
  await loadServicesFromSupabase();
  await loadBlockedTimes();
  await loadAppointments();
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
  if (!state.studioConfig.whatsapp || state.studioConfig.whatsapp === '5511999999999' || state.studioConfig.whatsapp === '5527988721801') {
    state.studioConfig.whatsapp = '5527988459016';
  }
  if (!state.studioConfig.address || state.studioConfig.address.includes('Studio Samara • Atendimento com Hora Marcada')) {
    state.studioConfig.address = 'Rua Nossa Senhora das Graças, Santo Antônio, Cariacica';
  }

  localStorage.setItem(STORAGE_CONFIG, JSON.stringify(state.studioConfig));

  const nameInput = document.getElementById('cfg-studio-name');
  const waInput = document.getElementById('cfg-samara-whatsapp');
  const addrInput = document.getElementById('cfg-studio-address');
  const pinInput = document.getElementById('cfg-admin-pin');

  if (nameInput) nameInput.value = state.studioConfig.name;
  if (waInput) waInput.value = state.studioConfig.whatsapp;
  if (addrInput) addrInput.value = state.studioConfig.address;
  if (pinInput) pinInput.value = state.studioConfig.pin;
}

function saveStudioConfig() {
  const nameInput = document.getElementById('cfg-studio-name');
  const waInput = document.getElementById('cfg-samara-whatsapp');
  const addrInput = document.getElementById('cfg-studio-address');
  const pinInput = document.getElementById('cfg-admin-pin');

  state.studioConfig = {
    name: nameInput.value.trim() || 'Samara Agendamento',
    whatsapp: waInput.value.trim().replace(/\D/g, '') || '5527988459016',
    address: addrInput.value.trim() || 'Rua Nossa Senhora das Graças, Santo Antônio, Cariacica',
    pin: pinInput.value.trim() || '1234'
  };

  localStorage.setItem(STORAGE_CONFIG, JSON.stringify(state.studioConfig));
  showToast('✓ Configurações do Studio salvas!');
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
      state.services = data.map(s => ({
        id: s.id,
        title: s.title,
        category: s.category,
        price: Number(s.price),
        durationMinutes: Number(s.duration_minutes),
        durationLabel: s.duration_label,
        icon: s.icon || '💅'
      }));
      console.log(`✓ ${data.length} serviços carregados diretamente do Supabase.`);
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

  // 2. Gravar no Supabase (Appointments + Auto-cadastro em Clients)
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

    if (supabaseClient) {
      await supabaseClient
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', id);
    }
    renderAdminAppointments();
    showToast(`Status atualizado para: ${newStatus}`);
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
// RENDERIZAÇÃO DE SERVIÇOS
// -------------------------------------------------------------
function renderServices() {
  const grid = document.getElementById('services-grid');
  grid.innerHTML = '';

  let filtered = state.activeCategory === 'all'
    ? state.services
    : state.services.filter(s => s.category === state.activeCategory);

  if (state.serviceSearchQuery) {
    const q = state.serviceSearchQuery.toLowerCase();
    filtered = filtered.filter(s => 
      s.title.toLowerCase().includes(q) || 
      (s.category && s.category.toLowerCase().includes(q))
    );
  }

  if (filtered.length === 0) {
    grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-faint); padding: 36px;">Nenhum procedimento encontrado com o termo "${state.serviceSearchQuery}".</p>`;
    return;
  }

  filtered.forEach(service => {
    const isSelected = state.selectedService && state.selectedService.id === service.id;
    const card = document.createElement('article');
    card.className = `service-card ${isSelected ? 'selected' : ''}`;
    card.id = `service-${service.id}`;
    card.tabIndex = 0;

    const categoryNames = {
      tradicional: 'Pé & Mão Tradicional',
      sobrancelhas: 'Sobrancelhas & Henna',
      gel: 'Alongamento & Gel',
      combos: 'Combo Especial'
    };

    card.innerHTML = `
      <div>
        <div class="service-header-top">
          <div class="service-icon-badge">${service.icon}</div>
          <h3 class="service-title">${service.title}</h3>
        </div>
        <p class="service-category-tag">${categoryNames[service.category] || service.category}</p>
      </div>
      <div class="service-footer">
        <span class="service-duration">⏱️ ${service.durationLabel}</span>
        <span class="service-price">R$ ${service.price.toFixed(2).replace('.', ',')}</span>
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
}

function selectService(service) {
  state.selectedService = service;
  renderServices();
  renderTimeSlots();
  updateSummary();
  showToast(`Procedimento: ${service.title} (${service.durationLabel})`);
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
    const isDayBlocked = state.blockedTimes.some(b => b.block_date === dayISO && !b.start_time);

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
// HORÁRIOS COM BLOQUEIO INTELIGENTE POR DURAÇÃO
// -------------------------------------------------------------
function renderTimeSlots() {
  const displayLabel = document.getElementById('selected-date-display');
  const slotsGrid = document.getElementById('slots-grid');
  slotsGrid.innerHTML = '';

  if (!state.selectedDate) {
    displayLabel.textContent = 'Selecione uma data no calendário';
    return;
  }

  const [y, m, d] = state.selectedDate.split('-');
  const durationInfo = state.selectedService ? ` (Duração: ${state.selectedService.durationLabel})` : '';
  displayLabel.textContent = `Horários para ${d}/${m}/${y}${durationInfo}:`;

  const dayBookings = state.appointments.filter(a => a.date === state.selectedDate && a.status === 'Confirmado');
  const dayBlocks = state.blockedTimes.filter(b => b.block_date === state.selectedDate);

  state.baseTimeSlots.forEach(time => {
    const slotMinutes = timeToMinutes(time);
    const serviceDuration = state.selectedService ? state.selectedService.durationMinutes : 60;
    const slotEndMinutes = slotMinutes + serviceDuration;

    // Ultrapassa horário de fechamento das 19:00
    const isTooLate = slotEndMinutes > (19 * 60);

    // Conflito com agendamentos existentes
    const isAppointmentConflict = dayBookings.some(booking => {
      const bStart = timeToMinutes(booking.time);
      const bookingService = state.services.find(s => s.id === booking.serviceId);
      const bDuration = bookingService ? bookingService.durationMinutes : 90;
      const bEnd = bStart + bDuration;
      return slotMinutes < bEnd && slotEndMinutes > bStart;
    });

    // Conflito com pausas/bloqueios parciais da Samara
    const isBlockedConflict = dayBlocks.some(block => {
      if (!block.start_time) return true; // Dia todo bloqueado
      const bStart = timeToMinutes(block.start_time);
      const bEnd = block.end_time ? timeToMinutes(block.end_time) : (bStart + 60);
      return slotMinutes < bEnd && slotEndMinutes > bStart;
    });

    const isBooked = isAppointmentConflict || isBlockedConflict || isTooLate;
    const isSelected = state.selectedTimeSlot === time;

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
      });
    }

    slotsGrid.appendChild(btn);
  });
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
// RESUMO E VALIDAÇÃO
// -------------------------------------------------------------
function updateSummary() {
  const summaryService = document.getElementById('summary-service');
  const summaryDuration = document.getElementById('summary-duration');
  const summaryDate = document.getElementById('summary-date');
  const summaryTime = document.getElementById('summary-time');
  const summaryPrice = document.getElementById('summary-price');
  const confirmBtn = document.getElementById('confirm-booking-btn');

  if (state.selectedService) {
    summaryService.textContent = state.selectedService.title;
    summaryDuration.textContent = state.selectedService.durationLabel;
    summaryPrice.textContent = `R$ ${state.selectedService.price.toFixed(2).replace('.', ',')}`;
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

  if (state.selectedTimeSlot && state.selectedService) {
    const startMin = timeToMinutes(state.selectedTimeSlot);
    const endMin = startMin + state.selectedService.durationMinutes;
    summaryTime.textContent = `${state.selectedTimeSlot}h às ${minutesToTime(endMin)}h`;
  } else {
    summaryTime.textContent = state.selectedTimeSlot ? `${state.selectedTimeSlot}h` : '-';
  }

  const isValid = state.selectedService && state.selectedDate && state.selectedTimeSlot;
  confirmBtn.disabled = !isValid;
}

// -------------------------------------------------------------
// CONFIRMAÇÃO DO AGENDAMENTO COM PERSISTÊNCIA EM NUVEM
// -------------------------------------------------------------
async function confirmBooking() {
  const nameInput = document.getElementById('client-name');
  const phoneInput = document.getElementById('client-phone');
  const notesInput = document.getElementById('client-notes');

  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();

  if (!name || !phone) {
    showToast('⚠️ Por favor, informe seu nome e WhatsApp.');
    nameInput.focus();
    return;
  }

  const startMin = timeToMinutes(state.selectedTimeSlot);
  const endMin = startMin + state.selectedService.durationMinutes;
  const calculatedEndTime = minutesToTime(endMin);

  const newAppointment = {
    id: 'apt-' + Date.now().toString().slice(-6),
    clientName: name,
    clientPhone: phone,
    serviceId: state.selectedService.id,
    serviceTitle: state.selectedService.title,
    date: state.selectedDate,
    time: state.selectedTimeSlot,
    endTime: calculatedEndTime,
    price: state.selectedService.price,
    notes: notesInput.value.trim(),
    status: 'Confirmado',
    createdAt: new Date().toISOString()
  };

  await saveNewAppointment(newAppointment);
  state.lastConfirmedBooking = newAppointment;

  renderTimeSlots();
  openSuccessModal(newAppointment);

  nameInput.value = '';
  phoneInput.value = '';
  notesInput.value = '';
  state.selectedTimeSlot = null;
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
  const durationLabel = service ? service.durationLabel : 'Tempo estimado';

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
      <span>Procedimento:</span>
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
  const durLabel = service ? service.durationLabel : '';

  const msg = `✨ *Olá Samara! Novo agendamento realizado no site:*%0A%0A` +
    `👤 *Cliente:* ${encodeURIComponent(b.clientName)}%0A` +
    `💅 *Procedimento:* ${encodeURIComponent(b.serviceTitle)}%0A` +
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
  const durationMin = service ? service.durationMinutes : 120;

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
  renderAdminAppointments();
}

function exitAdminView() {
  state.isAdminView = false;
  document.getElementById('admin-view').classList.remove('active');
  document.getElementById('client-view').classList.add('active');
  document.getElementById('view-mode-label').textContent = 'Painel Admin';
  renderServices();
  renderTimeSlots();
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

  const totalToday = state.appointments.filter(a => a.date === todayStr && a.status === 'Confirmado').length;
  const totalActive = state.appointments.filter(a => a.status === 'Confirmado').length;
  const projectedRevenue = state.appointments
    .filter(a => a.status === 'Confirmado' || a.status === 'Concluído')
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
    const card = document.createElement('div');
    card.className = 'appointment-item';

    card.innerHTML = `
      <div class="appt-client-info">
        <span class="appt-name">${item.clientName}</span>
        <span class="appt-phone">📞 ${item.clientPhone}</span>
      </div>
      <div class="appt-service-info">
        <span class="appt-service-title">${item.serviceTitle}</span>
        <span class="appt-datetime">📅 ${d}/${m}/${y} • ${item.time}h às ${item.endTime || '-'}h • R$ ${item.price.toFixed(2).replace('.', ',')}</span>
      </div>
      <div>
        <span class="appt-status-badge ${item.status.toLowerCase()}">${item.status}</span>
      </div>
      <div class="appt-actions">
        <button class="appt-btn whatsapp" onclick="sendClientReminder('${item.id}')" title="Enviar lembrete pelo WhatsApp">💬 Lembrete</button>
        ${item.status === 'Confirmado' ? `
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
// EXPORTAÇÃO DE RELATÓRIO EM CSV / EXCEL
// -------------------------------------------------------------
function exportAppointmentsCSV() {
  if (state.appointments.length === 0) {
    showToast('⚠️ Nenhum agendamento para exportar.');
    return;
  }

  let csvContent = 'Código;Data;Início;Término;Cliente;WhatsApp;Procedimento;Valor (R$);Status;Observações\n';

  state.appointments.forEach(a => {
    const row = [
      a.id,
      a.date,
      a.time,
      a.endTime || '',
      `"${a.clientName.replace(/"/g, '""')}"`,
      `"${a.clientPhone}"`,
      `"${a.serviceTitle.replace(/"/g, '""')}"`,
      a.price.toFixed(2).replace('.', ','),
      a.status,
      `"${(a.notes || '').replace(/"/g, '""')}"`
    ];
    csvContent += row.join(';') + '\n';
  });

  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `samara_agendamentos_${formatDateISO(new Date())}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('✓ Planilha CSV gerada com sucesso!');
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

  const refreshBtn = document.getElementById('btn-refresh-agenda');
  if (refreshBtn) refreshBtn.addEventListener('click', async () => {
    await loadAppointments();
    await loadBlockedTimes();
    await loadServicesFromSupabase();
    await loadClientsFromSupabase();
    renderAdminAppointments();
    renderAdminServices();
    renderAdminBlocks();
    renderAdminClients();
    renderTimeSlots();
    showToast('✓ Agenda e Banco sincronizados com Supabase!');
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
