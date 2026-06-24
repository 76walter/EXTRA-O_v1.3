export const DEFAULT_UF_OPTIONS = [
  'TODOS', 'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP',
  'SE', 'TO'
];

export const DEFAULT_WA_TEMPLATES = {
  "📱 Qualidade Padrão": "Olá, faço parte do setor de qualidade da TIM FIBRA.💙\n\nEstou acompanhando os atendimentos e gostaria de saber se você está satisfeito(a) com o serviço prestado?\n\n🚨Informamos que você conta com 4 meses de acesso ao nosso canal direto por este whatsapp, com início a partir da data de ativação do contrato.\nQualquer dúvida ou necessidade, estamos à disposição para te auxiliar!💙",
  "🛠️ Pós-Suporte": "Olá! Verificamos que seu suporte técnico foi concluído. 🛠️\n\nA conexão está funcionando normalmente agora?\n\nLembrando que você tem suporte direto conosco por este canal durante os próximos meses. Ficamos no aguardo! 💙",
  "📅 Lembrete Ativação": "Olá! Tudo bem? 😃\nPassando para confirmar se a sua instalação ocorreu conforme o agendado?\n\nSeja bem-vindo(a) à melhor fibra! 🚀 Qualquer dúvida, pode nos chamar por aqui.",
  "📄 Cobrança/Fatura": "Olá! Gostaria de informar que sua fatura já está disponível para pagamento. 📄\n\nCaso precise da segunda via ou código de barras, pode solicitar por aqui mesmo. Tenha um ótimo dia! ☀️",
  "🛠️ SUPORTE TÉCNICO INDISPONIVEL": "Olá, bom dia, senhor.\n\nVerificamos que, neste momento, está sendo realizada uma manutenção na região onde o senhor reside. Por esse motivo, não conseguimos agendar a visita do suporte técnico para atendimento em sua residência.\n\nO prazo para conclusão dessa manutenção é de até quatro horas. Pedimos que, após esse período, o senhor entre em contato conosco por um dos canais abaixo para solicitar suporte técnico, sua fatura ou outros serviços:\n\nWhatsApp para suporte: (21) 98056-3748\nAplicativo: Meu TIM",
  "🖋️ CPF / DATA E HORA PARA AGENDAR SUPORTE TÉCNICO": "Olá, senhor(a).\n\nPor gentileza, informe seu CPF, bem como a data e o horário de sua disponibilidade, para que possamos agendar a visita do suporte técnico.\n\nLembramos que, caso o senhor(a) não esteja em casa, será necessário que uma pessoa maior de 18 anos esteja presente para receber o técnico.",
  "💬 TRATATIVA DA PORTABILIDADE": "Olá, bom dia! Me chamo Walter e, a partir de agora, estarei lhe auxiliando no processo da sua portabilidade. O senhor está disponível?\n\nCaso esteja, preciso que o chip para o qual deseja a portabilidade esteja inserido no seu aparelho, de preferência com bom sinal.",
  "📺 COMO ACESSAR HBO MAX": "Olá! Tudo bem? 😊\nSiga o passo a passo abaixo para acessar o HBO Max:\n\nBaixe o aplicativo HBO Max na sua TV, celular ou tablet.\nNa tela inicial, selecione “Criar uma conta HBO Max”.\nEscolha a opção de acesso via operadora e selecione TIM FIBRA.\nFaça login com os dados da sua conta Meu TIM (CPF e senha).\n\n✅ Pronto! Após a confirmação, o acesso será liberado.\n\n⚠️ Importante:\nCaso você ainda não tenha cadastro no aplicativo Meu TIM, será necessário realizar o cadastro primeiro para conseguir acessar o HBO Max.\n\nSe precisar de ajuda em algum passo, estou à disposição!",
  "📺 ATIVAR GLOBO PLAY": "Olá! Tudo bem? 😊\n\nSe você está com dificuldade para acessar o Globoplay, siga o passo a passo abaixo para ativar sua assinatura:\n\nAbra o aplicativo Globoplay na sua TV.\nAcesse “Minha Conta” e selecione a opção “Entrar”.\nEm seguida, escolha “Associar operadora”.\nSelecione TIM na lista de operadoras.\nSiga as instruções exibidas na tela (pode ser necessário fazer login ou inserir um código de validação).\n\nApós a confirmação, sua assinatura será liberada e você poderá aproveitar normalmente 😉\n\nSe ainda tiver dificuldades, o senhor(a) pode estar entrando em contato com a central pelo número - 10341",
  "📱 PORTABILIDADE PARA A TIM": "Olá! Tudo bem? 😊\nSe você deseja trazer seu número para a TIM, siga as instruções abaixo:\n\n1. Solicitação do pedido\nAcesse o site e faça sua solicitação:\n👉 https://meuplanotim.com.br/pedido/vtxtimvarejocontroleaplus\n\n2. Envio de SMS\nEnvie um SMS com a palavra PORTABILIDADE para o número 7678.\n\n3. Confirmação da operadora\nApós o envio, você receberá uma mensagem para confirmar de qual operadora deseja portar seu número (prazo médio de até 30 minutos).\n\n4. Confirmação do pedido\nVocê receberá um SMS do número 7678:\n\nResponda SIM para confirmar a portabilidade\nOu NÃO para cancelar\n\n⏱️ Importante: Caso não responda dentro do prazo, o pedido será cancelado automaticamente.\n\n5. Acompanhamento do pedido\nVocê pode verificar o status pelo site:\n👉 https://www.tim.com.br/para-voce/planos/portabilidade\n\n📦 Entrega do chip\nO prazo é de até 7 dias úteis.\n\n🔄 Conclusão da portabilidade\nApós receber o chip, a portabilidade será finalizada em até 7 dias úteis.\nDurante esse período, você poderá utilizar um número provisório.\n\n⚠️ Atenção:\nFique atento aos prazos de confirmação e conclusão para evitar cancelamentos ou cobranças indevidas.",
  "😠 CLIENTE INSATISFEITO": "Olá, boa tarde, senhor! 😊\n\nPor gentileza, poderia nos descrever como foi a tratativa com o vendedor, especialmente em relação ao produto que foi oferecido e contratado, bem como o que foi efetivamente instalado em sua residência?\n\nEssas informações são importantes para que possamos analisar e tratar sua solicitação da melhor forma possível.\n\nFicamos no aguardo do seu retorno."
};

export const formatPhone = (phone) => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)})${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)})${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
};

export const normalizePhone = (phone) => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('55')) return digits.slice(2);
  if (digits.length === 13 && digits.startsWith('55')) return digits.slice(2);
  return digits;
};

export const parsePhoneNumbers = (rawText) => {
  return String(rawText)
    .split(/\r?\n/)
    .map(line => line.replace(/\D/g, ''))
    .filter(cleanNum => cleanNum.length >= 10)
    .map(number => ({ number, sent: false }));
};

const dddMap = {
  '11': 'SP','12': 'SP','13': 'SP','14': 'SP','15': 'SP','16': 'SP','17': 'SP','18': 'SP','19': 'SP',
  '21': 'RJ','22': 'RJ','24': 'RJ','27': 'ES','28': 'ES',
  '31': 'MG','32': 'MG','33': 'MG','34': 'MG','35': 'MG','37': 'MG','38': 'MG',
  '41': 'PR','42': 'PR','43': 'PR','44': 'PR','45': 'PR','46': 'PR',
  '47': 'SC','48': 'SC','49': 'SC',
  '51': 'RS','53': 'RS','54': 'RS','55': 'RS',
  '61': 'DF','62': 'GO','64': 'GO','63': 'TO',
  '65': 'MT','66': 'MT','67': 'MS','68': 'AC','69': 'RO',
  '71': 'BA','73': 'BA','74': 'BA','75': 'BA','77': 'BA','79': 'SE',
  '81': 'PE','87': 'PE','82': 'AL','83': 'PB','84': 'RN','85': 'CE','88': 'CE',
  '86': 'PI','89': 'PI',
  '91': 'PA','92': 'AM','93': 'PA','94': 'PA','95': 'RR','96': 'AP','97': 'AM','98': 'MA','99': 'MA'
};

export const guessUfFromPhone = (phone) => {
  const digits = phone.replace(/\D/g, '');
  const ddd = digits.slice(0, 2);
  return dddMap[ddd] || '';
};

export const buildTemplatePreview = (template, data = {}, vendedor = '') => {
  const replacements = {
    nome_cliente: data.nome_cliente || data.nome || '',
    cpf_cliente: data.cpf_cliente || data.cpf || '',
    cnpj_cliente: data.cnpj_cliente || '',
    consultora: data.consultora || vendedor || '',
    supervisor: data.supervisor || '',
    uf: data.uf || guessUfFromPhone(data.tel || data.tel1 || ''),
    tel1: data.tel1 || '',
    tel2: data.tel2 || '',
    telefone: data.tel2 ? `${data.tel1} / ${data.tel2}` : (data.tel1 || ''),
    endereco: data.endereco || '',
    email: data.email || '',
    plano: data.plano || '',
    valor_plano: data.valor_plano || '',
    data_vencimento: data.vencimento || data.data_vencimento || '',
    data_nascimento: data.nascimento || data.data_nascimento || '',
    nome_mae: data.mae || data.nome_mae || '',
    nome_fantasia: data.nome_fantasia || '',
    cnpj_nome_rep: data.cnpj_nome_rep || '',
    cnpj_cpf_rep: data.cnpj_cpf_rep || '',
    cnpj_email_rep: data.cnpj_email_rep || '',
    cnpj_nasc_rep: data.cnpj_nasc_rep || '',
    vencimento_fatura: data.vencimento_fatura || ''
  };

  return Object.entries(replacements).reduce((content, [key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    
    // GARANTIA: Se 'value' for um objeto, force a conversão ou extraia o dado real
    let safeValue = value;
    if (typeof safeValue === 'object' && safeValue !== null) {
      console.warn(`[WARNING] A variável '${key}' é um objeto!`, safeValue);
      safeValue = JSON.stringify(safeValue);
    }
    if (safeValue === undefined || safeValue === null) safeValue = '';

    return content.replace(regex, safeValue);
  }, template || 'Selecione uma máscara para ver o preview.');
};

const UF_DDD = {
  'AM': ['92', '97'], 'AC': ['68'], 'AL': ['82'], 'AP': ['96'], 'BA': ['71', '73', '74', '75', '77'],
  'CE': ['85', '88'], 'DF': ['61'], 'ES': ['27', '28'], 'GO': ['62', '64'], 'MA': ['98', '99'],
  'MT': ['65', '66'], 'MS': ['67'], 'MG': ['31', '32', '33', '34', '35', '37', '38'],
  'PA': ['91', '93', '94'], 'PB': ['83'], 'PR': ['41', '42', '43', '44', '45', '46'],
  'PE': ['81', '87'], 'PI': ['86', '89'], 'RJ': ['21', '22', '24'], 'RN': ['84'],
  'RS': ['51', '53', '54', '55'], 'RO': ['69'], 'RR': ['95'], 'SC': ['47', '48', '49'],
  'SP': ['11', '12', '13', '14', '15', '16', '17', '18', '19'], 'SE': ['79'], 'TO': ['63']
};

const extractContactsFromCells = (row, activeColumns, targetDDDs, uniqueNumbers) => {
  const contacts = [];
  activeColumns.forEach(index => {
    const value = row[index];
    if (!value) return;
    const clean = String(value).replace(/\D/g, '');
    if (clean.length < 10 || uniqueNumbers.has(clean)) return;

    const normalized = clean.startsWith('55') && clean.length > 11 ? clean.slice(2) : clean;
    const ddd = normalized.slice(0, 2);
    if (targetDDDs.length && !targetDDDs.includes(ddd)) return;

    uniqueNumbers.add(normalized);
    contacts.push({ number: normalized, sent: false });
  });
  return contacts;
};

export const extractContactsFromRows = (rows, uf = 'TODOS', maxContacts = 20, startIndex = 0) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { contacts: [], nextIndex: startIndex, finished: true };
  }

  const targetDDDs = uf === 'TODOS' ? [] : (UF_DDD[uf] || []);
  const uniqueNumbers = new Set();
  const phoneHeaders = ['telefone', 'número', 'numero', 'celular', 'contato'];

  let activeColumns = [23, 24, 40, 41];
  let headerRowIndex = 0;

  for (let i = 0; i < Math.min(rows.length, 10); i += 1) {
    const row = rows[i] || [];
    const match = row.findIndex(cell => {
      if (!cell) return false;
      const text = String(cell).toLowerCase();
      return phoneHeaders.some(keyword => text.includes(keyword));
    });
    if (match !== -1) {
      headerRowIndex = i;
      activeColumns = Array.from(new Set([...activeColumns, match]));
      break;
    }
  }

  const found = [];
  let currentIndex = Math.max(startIndex, headerRowIndex + 1);

  while (currentIndex < rows.length && found.length < maxContacts) {
    const row = rows[currentIndex];
    currentIndex += 1;
    if (!row || row.every(cell => cell === undefined || cell === null || String(cell).trim() === '')) continue;

    const contacts = extractContactsFromCells(row, activeColumns, targetDDDs, uniqueNumbers);
    contacts.forEach(contact => {
      if (found.length < maxContacts) found.push(contact);
    });
  }

  return {
    contacts: found,
    nextIndex: currentIndex,
    finished: currentIndex >= rows.length
  };
};

export const copyTextToClipboard = async (text) => {
  if (!text) return;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand('copy');
  document.body.removeChild(textArea);
};
