/**
 * ============================================================================
 * CONECTOR OFICIAL: APP SAMARA DESIGNER <-> GOOGLE PLANILHAS
 * Planilha ID: 1QojXTSpQl6D4jp3_CG6aDKYOb-vlukehjpfrN0kNgCY
 * ============================================================================
 * COMO INSTALAR NA PLANILHA DA SAMARA (1 MINUTO):
 * 1. Abra a planilha "Agendamento" no Google Planilhas
 * 2. No menu superior, clique em: Extensões -> Apps Script
 * 3. Apague qualquer código que estiver lá e cole TODO este código
 * 4. Clique no ícone de Disquete (Salvar)
 * 5. No canto superior direito, clique em "Implantar" -> "Nova implantação"
 * 6. Em "Selecionar tipo" (engrenagem), escolha: "App da Web"
 * 7. Em "Quem pode acessar", escolha: "Qualquer pessoa"
 * 8. Clique em "Implantar", autorize sua conta Google e copie a "URL do App da Web"
 * 9. Cole essa URL no Painel Admin do App Samara Designer (aba Configurações)!
 * ============================================================================
 */

const SPREADSHEET_ID = '1QojXTSpQl6D4jp3_CG6aDKYOb-vlukehjpfrN0kNgCY';

const MESES_NOMES = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
];

const DIAS_SEMANA_SAMARA = ['Dom', 'Seg', 'Terc', 'Quart', 'Quint', 'Sext', 'Sab'];

/**
 * Localiza a aba do mês correspondente (ex: "NOVEMBRO 2026" ou "Junho 2026")
 */
function findOrCreateMonthSheet(ss, year, monthIndex) {
  const targetMonthName = MESES_NOMES[monthIndex]; // 0 = JANEIRO ... 10 = NOVEMBRO
  const targetFullUpper = (targetMonthName + ' ' + year).toUpperCase();
  const sheets = ss.getSheets();

  for (let i = 0; i < sheets.length; i++) {
    const nameUpper = sheets[i].getName().trim().toUpperCase();
    if (nameUpper === targetFullUpper || nameUpper.replace('Ç', 'C') === targetFullUpper.replace('Ç', 'C')) {
      return sheets[i];
    }
  }

  // Se não existir a aba do mês, cria uma nova com o cabeçalho padrão da Samara
  const newSheet = ss.insertSheet(targetFullUpper);
  const headerRange = newSheet.getRange('A1:G1');
  headerRange.setValues([['', 'Data', 'Cliente', 'Horário', 'Arte', 'Valor', 'Status']]);
  newSheet.getRange('A1:F1').setBackground('#00ff00').setFontWeight('bold');
  newSheet.getRange('G1').setFontWeight('bold');
  return newSheet;
}

/**
 * GET: Lê todos os agendamentos e compromissos da planilha para bloquear horários no App
 */
function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheets = ss.getSheets();
    const allBookings = [];

    sheets.forEach(sheet => {
      const sheetName = sheet.getName().trim().toUpperCase();
      let foundMonthIdx = -1;
      let foundYear = null;

      for (let m = 0; m < MESES_NOMES.length; m++) {
        const mName = MESES_NOMES[m];
        if (sheetName.indexOf(mName) !== -1 || sheetName.indexOf(mName.replace('Ç', 'C')) !== -1) {
          foundMonthIdx = m;
          const yearMatch = sheetName.match(/20\d{2}/);
          foundYear = yearMatch ? parseInt(yearMatch[0], 10) : new Date().getFullYear();
          break;
        }
      }

      if (foundMonthIdx === -1) return;

      const lastRow = sheet.getLastRow();
      if (lastRow < 2) return;

      const values = sheet.getRange(2, 1, lastRow - 1, 7).getDisplayValues();
      values.forEach((row, idx) => {
        const dayRaw = String(row[0] || '').trim();
        const weekDay = String(row[1] || '').trim();
        const clientName = String(row[2] || '').trim();
        const timeRaw = String(row[3] || '').trim();
        const arte = String(row[4] || '').trim();
        const valorRaw = String(row[5] || '').trim();
        const statusRaw = String(row[6] || '').trim().toLowerCase();

        const dayNum = parseInt(dayRaw, 10);
        if (!dayNum || isNaN(dayNum) || !timeRaw || !clientName) return;

        // Normalizar horário "07:00:00" -> "07:00"
        const timeParts = timeRaw.split(':');
        if (timeParts.length < 2) return;
        const hh = String(timeParts[0]).padStart(2, '0');
        const mm = String(timeParts[1]).padStart(2, '0');
        const normalizedTime = hh + ':' + mm;

        const mmMonth = String(foundMonthIdx + 1).padStart(2, '0');
        const ddDay = String(dayNum).padStart(2, '0');
        const isoDate = foundYear + '-' + mmMonth + '-' + ddDay;

        let appStatus = 'Confirmado';
        if (statusRaw.indexOf('cancel') !== -1) {
          appStatus = 'Cancelado';
        } else if (statusRaw.indexOf('rejeit') !== -1) {
          appStatus = 'Rejeitado';
        } else if (statusRaw.indexOf('aguard') !== -1) {
          appStatus = 'Aguardando';
        }

        allBookings.push({
          id: 'sheet-' + foundYear + mmMonth + ddDay + '-' + hh + mm + '-' + (idx + 2),
          rowNumber: idx + 2,
          sheetName: sheet.getName(),
          date: isoDate,
          day: dayNum,
          weekDay: weekDay,
          clientName: clientName,
          time: normalizedTime,
          serviceTitle: arte || ('Compromisso (' + clientName + ')'),
          price: parseFloat(valorRaw.replace(',', '.')) || 0,
          status: appStatus,
          source: 'google_sheets'
        });
      });
    });

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, bookings: allBookings }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * POST: Recebe um novo agendamento ou atualização de status do App e grava na Planilha
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // Payload esperado: { action: 'upsert' | 'status', date: 'YYYY-MM-DD', time: 'HH:MM', clientName, arte, price, status }
    const dateParts = (payload.date || '').split('-');
    if (dateParts.length !== 3) {
      throw new Error('Data inválida: ' + payload.date);
    }

    const year = parseInt(dateParts[0], 10);
    const monthIndex = parseInt(dateParts[1], 10) - 1;
    const dayNum = parseInt(dateParts[2], 10);

    const dateObj = new Date(year, monthIndex, dayNum, 12, 0, 0);
    const weekDayLabel = DIAS_SEMANA_SAMARA[dateObj.getDay()];

    const sheet = findOrCreateMonthSheet(ss, year, monthIndex);
    const timeFormatted = payload.time.length === 5 ? (payload.time + ':00') : payload.time;
    const sheetStatus = (payload.status || 'aguardando').toLowerCase();

    const lastRow = sheet.getLastRow();

    // Verificar se já existe linha para este mesmo Dia + Horário + Cliente para atualizar em vez de duplicar
    if (lastRow >= 2) {
      const existing = sheet.getRange(2, 1, lastRow - 1, 7).getDisplayValues();
      for (let i = 0; i < existing.length; i++) {
        const rDay = parseInt(existing[i][0], 10);
        const rClient = String(existing[i][2] || '').trim().toLowerCase();
        const rTime = String(existing[i][3] || '').trim().slice(0, 5);

        if (rDay === dayNum && rTime === payload.time.slice(0, 5) &&
            (rClient === String(payload.clientName || '').trim().toLowerCase() || payload.action === 'status')) {
          const targetRow = i + 2;
          if (payload.action === 'status') {
            sheet.getRange(targetRow, 7).setValue(sheetStatus);
          } else {
            sheet.getRange(targetRow, 1, 1, 7).setValues([[
              dayNum,
              weekDayLabel,
              payload.clientName,
              timeFormatted,
              payload.arte,
              payload.price,
              sheetStatus
            ]]);
          }
          return ContentService
            .createTextOutput(JSON.stringify({ ok: true, updatedRow: targetRow, sheet: sheet.getName() }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    // Inserir na posição correta ordenada pelo Dia (Coluna A)
    let insertAfterRow = lastRow;
    if (lastRow >= 2) {
      const existing = sheet.getRange(2, 1, lastRow - 1, 4).getDisplayValues();
      for (let i = 0; i < existing.length; i++) {
        const rDay = parseInt(existing[i][0], 10);
        if (!isNaN(rDay) && rDay > dayNum) {
          insertAfterRow = i + 1;
          break;
        }
      }
    }

    const newRowData = [
      dayNum,
      weekDayLabel,
      payload.clientName,
      timeFormatted,
      payload.arte,
      payload.price,
      sheetStatus
    ];

    if (insertAfterRow < lastRow && insertAfterRow >= 1) {
      sheet.insertRowAfter(insertAfterRow);
      const targetRow = insertAfterRow + 1;
      try {
        sheet.getRange(targetRow, 1, 1, 7).setValues([newRowData]);
      } catch (valErr) {
        // Caso algum valor tenha diferença de espaço na Validação de Dados, grava coluna por coluna
        for (let c = 0; c < 7; c++) {
          try {
            sheet.getRange(targetRow, c + 1).setValue(newRowData[c]);
          } catch (cellErr) {
            if (c === 4 && String(newRowData[c]).trim() === 'Pé') {
              sheet.getRange(targetRow, c + 1).setValue('Pé ');
            }
          }
        }
      }
    } else {
      sheet.appendRow(newRowData);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, inserted: true, sheet: sheet.getName() }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

