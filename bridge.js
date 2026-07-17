import express from 'express';
import cors from 'cors';
import { chromium } from 'playwright';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const MASKS_FILE = path.join(__dirname, 'masks.json');
const PLANILHA_FILE = path.join(__dirname, 'planilha.xlsx');
const PARCELAMENTO_FILE = path.join(__dirname, 'PARCELAMENTO.xlsx');

// ─── BUSCA VENCIMENTO NA PLANILHA (planilha.xlsx) ───────────────────────────
const buscarVencimentoNaPlanilha = (documento) => {
    try {
        if (!documento) return '';
        const docLimpo = documento.replace(/\D/g, '');
        if (docLimpo.length < 6) return '';

        if (!fs.existsSync(PLANILHA_FILE)) {
            console.warn('⚠️ planilha.xlsx não encontrada em:', PLANILHA_FILE);
            return '';
        }

        const workbook = XLSX.readFile(PLANILHA_FILE);
        const nomePlanilha = workbook.SheetNames[0];
        const sheet = workbook.Sheets[nomePlanilha];
        const dados = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        for (let i = 0; i < dados.length; i++) {
            const linha = dados[i];
            const colA = String(linha[0] || '').replace(/\D/g, '');
            if (colA.length >= 6 && colA === docLimpo) {
                const colG = linha[6]; // Coluna G (índice 6)
                const colH = linha[7]; // Coluna H (índice 7)

                // Formata data da coluna G
                let dataFormatada = '';
                if (colG !== '' && colG !== undefined && colG !== null) {
                    if (typeof colG === 'number') {
                        const d = XLSX.SSF.parse_date_code(colG);
                        dataFormatada = `${String(d.d).padStart(2,'0')}/${String(d.m).padStart(2,'0')}/${d.y}`;
                    } else {
                        dataFormatada = String(colG).trim();
                    }
                }

                // Formata valor da coluna H
                let valorFormatado = '';
                if (colH !== '' && colH !== undefined && colH !== null) {
                    if (typeof colH === 'number') {
                        valorFormatado = `R$  ${colH.toFixed(2).replace('.', ',')}`.replace(/\.(\d)$/, ',$10');
                    } else {
                        valorFormatado = String(colH).trim();
                        if (!valorFormatado.toUpperCase().includes('R$') && /\d/.test(valorFormatado)) {
                            valorFormatado = `R$  ${valorFormatado}`;
                        }
                    }
                }

                if (dataFormatada || valorFormatado) {
                    return `${dataFormatada}   =   ${valorFormatado}`.trim();
                }
            }
        }
        return '';
    } catch (e) {
        console.error('❌ Erro ao buscar vencimento na planilha:', e.message);
        return '';
    }
};

// ─── BUSCA VENCIMENTO NO PARCELAMENTO.xlsx (para máscaras Parcelamento SMB/Fibra) ──
// Busca TODAS as linhas que batem com o CPF/CNPJ na coluna A,
// extrai coluna G (data vencimento) e coluna H (valor da fatura),
// e retorna no formato: "07/05/2026 = R$ 4,23" (uma linha por fatura)
const buscarVencimentoNoParcelamento = (documento) => {
    try {
        logDebug(`🔍 buscarVencimentoNoParcelamento chamada para documento: "${documento}"`);
        if (!documento) {
            logDebug(`⚠️ documento vazio, retornando vazio`);
            return '';
        }
        const docLimpo = documento.replace(/\D/g, '');
        logDebug(`📋 documento limpo: "${docLimpo}"`);
        if (docLimpo.length < 6) {
            logDebug(`⚠️ documento muito curto (<6 dígitos), retornando vazio`);
            return '';
        }

        logDebug(`📂 Caminho resolvido da planilha: "${PARCELAMENTO_FILE}"`);
        if (!fs.existsSync(PARCELAMENTO_FILE)) {
            logDebug(`❌ Arquivo não encontrado em: "${PARCELAMENTO_FILE}"`);
            console.warn('⚠️ PARCELAMENTO.xlsx não encontrada em:', PARCELAMENTO_FILE);
            return '';
        }

        logDebug(`📖 Lendo planilha...`);
        const workbook = XLSX.readFile(PARCELAMENTO_FILE);
        logDebug(`Abas encontradas: [${workbook.SheetNames.join(', ')}]`);
        const resultados = [];

        // Padroniza o documento para matching flexível (pad com zeros à esquerda)
        const docPadded = docLimpo.padStart(11, '0');

        // Busca em TODAS as abas (JUNHO-JULHO e MARÇO-MAIO)
        for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const dados = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });
            logDebug(`Processando aba "${sheetName}" com ${dados.length} linhas`);

            for (let i = 1; i < dados.length; i++) {
                const linha = dados[i];
                if (!linha[0]) continue;

                const cellVal = String(linha[0]).replace(/\D/g, '');
                if (!cellVal) continue;

                // Matching flexível (igual à extensão): exato, includes ou padded
                const cellPadded = cellVal.padStart(11, '0');
                const isMatch = (cellVal === docLimpo) ||
                                (cellPadded === docPadded) ||
                                (cellVal.includes(docLimpo)) ||
                                (docLimpo.includes(cellVal) && cellVal.length >= 6);

                if (isMatch) {
                    const colG = linha[6]; // Coluna G — VENCIMENTO FATURA
                    const colH = linha[7]; // Coluna H — VALOR DA FATURA(S)

                    // Formata data da coluna G
                    let dataFormatada = '';
                    if (colG !== '' && colG !== undefined && colG !== null) {
                        if (typeof colG === 'number') {
                            const d = XLSX.SSF.parse_date_code(colG);
                            dataFormatada = `${String(d.d).padStart(2,'0')}/${String(d.m).padStart(2,'0')}/${d.y}`;
                        } else {
                            dataFormatada = String(colG).trim();
                        }
                    }

                    // Formata valor da coluna H (formato igual à extensão: R$  valor)
                    let valorFormatado = '';
                    if (colH !== '' && colH !== undefined && colH !== null) {
                        if (typeof colH === 'number') {
                            valorFormatado = `R$  ${colH.toFixed(2).replace('.', ',')}`;
                        } else {
                            valorFormatado = String(colH).replace('.', ',').trim();
                            if (!valorFormatado.toUpperCase().includes('R$') && /\d/.test(valorFormatado)) {
                                valorFormatado = `R$  ${valorFormatado}`;
                            }
                        }
                    }

                    if (dataFormatada || valorFormatado) {
                        const matchResult = `${dataFormatada}   =   ${valorFormatado}`.trim();
                        logDebug(`🎯 MATCH na aba "${sheetName}" linha ${i+1}: "${matchResult}" (original ColA="${linha[0]}")`);
                        resultados.push(matchResult);
                    }
                }
            }
        }

        if (resultados.length > 0) {
            logDebug(`✅ Faturas encontradas: ${resultados.length}`);
            return resultados.join('\n');
        }
        logDebug(`❌ Nenhuma fatura correspondente na planilha.`);
        return '';
    } catch (e) {
        logDebug(`❌ Erro no buscarVencimentoNoParcelamento: ${e.message}`);
        console.error('❌ Erro ao buscar vencimento no PARCELAMENTO.xlsx:', e.message);
        return '';
    }
};

// Função para garantir que o arquivo de máscaras existe
const loadMasks = () => {
    if (!fs.existsSync(MASKS_FILE)) {
        return {}; // Retorna vazio se não existir
    }
    return JSON.parse(fs.readFileSync(MASKS_FILE, 'utf-8'));
};

const saveMasks = (masks) => {
    fs.writeFileSync(MASKS_FILE, JSON.stringify(masks, null, 2));
};

app.get('/masks', (req, res) => {
    res.json(loadMasks());
});

app.post('/masks', (req, res) => {
    const { name, template } = req.body;
    const masks = loadMasks();
    masks[name] = template;
    saveMasks(masks);
    res.json({ success: true });
});

app.delete('/masks/:name', (req, res) => {
    const masks = loadMasks();
    delete masks[req.params.name];
    saveMasks(masks);
    res.json({ success: true });
});

app.get('/launch-spreadsheet', async (req, res) => {
    try {
        const page = await getVTMEPage();
        
        // 1. Extrair os dados principais com o contrato ABERTO
        const data1 = await page.evaluate(() => {
            const extractByLabel = (labelName) => {
                const labels = Array.from(document.querySelectorAll('label, span, div, th, td, b, strong'));
                const targetLabels = labels.filter(l => l.innerText && l.innerText.trim().replace(/:/g, '').toLowerCase() === labelName.toLowerCase());
                for (const label of targetLabels) {
                    let nextEl = label.nextElementSibling;
                    let value = "";
                    if (nextEl) {
                        if (nextEl.tagName === 'INPUT') value = nextEl.value;
                        else value = nextEl.innerText;
                    }
                    if (!value || value.trim() === "") {
                         value = label.parentElement.innerText.replace(label.innerText, '');
                    }
                    if (!value || value.trim() === "") {
                         const parentInput = label.parentElement.querySelector('input');
                         if (parentInput) value = parentInput.value;
                    }
                    value = value.trim();
                    if (value && value !== "") return value;
                }
                return "";
            };

            const cpf = extractByLabel('CPF') || extractByLabel('CNPJ');
            const cleanCpf = cpf ? cpf.replace(/\D/g, '') : '';
            const months = ["", "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
            const finalizado = extractByLabel('Finalizado em') || "";
            const monthIndex = finalizado.includes('/') ? parseInt(finalizado.split('/')[1]) : 0;

            return {
                cliente: extractByLabel('Cliente') || extractByLabel('Nome') || extractByLabel('Nome Cliente'),
                cpf: cpf,
                cleanCpf: cleanCpf,
                consultor: (extractByLabel('Consultor') || "").split('-')[0].trim(),
                supervisor: (extractByLabel('Supervisor') || "").split('-')[0].trim(),
                uf: document.body.innerText.match(/\/\s*([A-Z]{2})/)?.[1] || "",
                gross: months[monthIndex] || "",
                contato: new Date().toLocaleDateString('pt-BR')
            };
        });

        // 2. Fechar o contrato aberto para voltar à lista
        await page.evaluate(() => {
             const buttons = Array.from(document.querySelectorAll('button, a, span'));
             const fecharBtn = buttons.find(b => b.innerText && (b.innerText.trim().toUpperCase() === 'FECHAR' || b.innerText.trim().toUpperCase() === 'VOLTAR'));
             if (fecharBtn) {
                 fecharBtn.click();
             } else {
                 const iconClose = document.querySelector('.fa-times, .close, .btn-close, [title="Fechar"], [aria-label="Fechar"]');
                 if (iconClose) iconClose.click();
             }
        });
        
        // Aguarda a tela "de trás" carregar/renderizar
        await page.waitForTimeout(1500);

        // 3. Extrair as datas na tela da lista (camada anterior)
        const data2 = await page.evaluate((cpfParaBusca) => {
            const dateRegex = /(\d{2}\/[\w\d]{2}\/\d{2,4}(?:\s*(?:-|às)?\s*\d{2}:\d{2}(:\d{2})?)?)/; 
            let criacaoFinal = "";
            let instalacaoFinal = "";

            // TENTATIVA 1: Dica do usuário por posições predefinidas da tabela
            const rows = Array.from(document.querySelectorAll('.ui-grid-row, tr, .row'));
            let myRow = rows.find(r => r.innerText && r.innerText.replace(/\D/g, '').includes(cpfParaBusca));
            if (!myRow) myRow = rows.find(r => r.classList && r.classList.contains('ui-grid-row-selected'));

            if (myRow) {
                const cells = Array.from(myRow.querySelectorAll('.ui-grid-cell, td'));
                if (cells.length > 5) {
                    // Dica: Data Criação = Esquerda pra direta 3 (array index 2)
                    let possivelCriacao = cells[2] ? cells[2].innerText.trim() : "";
                    if (dateRegex.test(possivelCriacao)) criacaoFinal = possivelCriacao.match(dateRegex)[1];

                    // Dica: Data Instalação = Direita pra esquerda 10
                    let idxInstalacao = cells.length >= 10 ? cells.length - 10 : 0;
                    let possivelInstalacao = cells[idxInstalacao] ? cells[idxInstalacao].innerText.trim() : "";
                    if (dateRegex.test(possivelInstalacao)) instalacaoFinal = possivelInstalacao.match(dateRegex)[1];
                }
            }

            // TENTATIVA 2: Busca por cabeçalhos ou rótulos próximos se a TENTATIVA 1 falhou E GARANTINDO SER DATA
            const extractByRegexStrictMode = (targetKeywords) => {
                const gridHeaders = Array.from(document.querySelectorAll('.ui-grid-header-cell-label, th, .header-label'));
                const colIndex = gridHeaders.findIndex(h => targetKeywords.some(k => h.innerText.toLowerCase().includes(k.toLowerCase())));
                
                if (colIndex !== -1 && myRow) {
                    const cells = Array.from(myRow.querySelectorAll('.ui-grid-cell, td'));
                    if (cells[colIndex]) {
                        const textVal = cells[colIndex].innerText.trim();
                        if (dateRegex.test(textVal)) return textVal.match(dateRegex)[1];
                    }
                }

                // Varredura rigorosa só retornando se FOR DATA (Ex: não retornar 'Biometria')
                const allElements = Array.from(document.querySelectorAll('label, span, b, p, div, strong'));
                for (const el of allElements) {
                    if(!el.innerText) continue;
                    const text = el.innerText.trim().toLowerCase();
                    if (targetKeywords.some(k => text === k.toLowerCase() || text === k.toLowerCase() + ":")) {
                        let current = el;
                        for(let i=0; i<3; i++) {
                            current = current.nextElementSibling || current.parentElement;
                            if (current && current.innerText && dateRegex.test(current.innerText)) {
                                return current.innerText.match(dateRegex)[1];
                            }
                            if (current && current.querySelector && current.querySelector('input') && current.querySelector('input').value) {
                                let val = current.querySelector('input').value;
                                if (dateRegex.test(val)) return val.match(dateRegex)[1];
                            }
                        }
                        // Verifica no proprio texto pai (para casos onde está grudadinho)
                        if (dateRegex.test(el.parentElement.innerText)) {
                             return el.parentElement.innerText.match(dateRegex)[1];
                        }
                    }
                }
                return "";
            };

            if (!criacaoFinal) {
                criacaoFinal = extractByRegexStrictMode(['Data Criação', 'Data do Pedido', 'Criação', 'Data de Inserção', 'Inserção', 'Entrada Status']);
            }
            if (!instalacaoFinal) {
                instalacaoFinal = extractByRegexStrictMode(['Data Instalação', 'Data Ativação', 'Agendamento', 'Instalação']);
            }

            return {
                criacao: criacaoFinal || "",
                instalacao: instalacaoFinal || ""
            };
        }, data1.cleanCpf);

        // Mescla os dados
        const data = {
            ...data1,
            criacao: data2.criacao,
            instalacao: data2.instalacao
        };

        // 2. Localizar aba da planilha ou abrir nova
        const spreadsheetUrl = "https://onedrive.live.com/:x:/g/personal/0dd5456ada276c57/IQBPvPPh8hyjR7cxFp0kiYCsAfocgBoUH6JF7T-EMPI01GM?rtime=nw-azluX3kg&nav=MTVfezAwMDAwMDAwLTAwMDEtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMH0&redeem=aHR0cHM6Ly8xZHJ2Lm1zL3gvYy8wZGQ1NDU2YWRhMjc2YzU3L0lRQlB2UFBoOGh5alI3Y3hGcDBraVlDc0Fmb2NnQm9VSDZKRjdULUVNUEkwMUdNP2U9WjFjd2NUJm5hdj1NVFZmZXpBd01EQXdNREF3TFRBd01ERXRNREF3TUMwd01EQXdMVEF3TURBd01EQXdNREF3TUgw";
        
        let sheetPage = context.pages().find(p => p.url().includes('onedrive.live.com') || p.url().includes('1drv.ms'));
        
        if (!sheetPage) {
            sheetPage = await context.newPage();
            await sheetPage.goto(spreadsheetUrl, { waitUntil: 'load', timeout: 60000 });
            await sheetPage.waitForTimeout(10000); 
        } else {
            await sheetPage.bringToFront();
        }

        // Lógica para encontrar linha vazia
        console.log("Localizando linha vazia...");
        await sheetPage.keyboard.press('Control+Home'); 
        await sheetPage.waitForTimeout(1000);
        await sheetPage.keyboard.press('Control+ArrowDown');
        await sheetPage.waitForTimeout(500);
        await sheetPage.keyboard.press('ArrowDown'); 
        
        // 3. Preenchimento campo a campo conforme a nova ordem: A a I
        console.log("Preenchendo colunas de A a I...");
        const fields = [
            data.cliente,      // A
            data.cpf,          // B
            data.consultor,    // C
            data.supervisor,   // D
            data.uf,           // E
            data.gross,        // F
            data.criacao,      // G
            data.instalacao,   // H
            data.contato       // I
        ];

        for (const field of fields) {
            await sheetPage.keyboard.type(field || "");
            await sheetPage.keyboard.press('Tab');
            await sheetPage.waitForTimeout(200);
        }
        
        await sheetPage.keyboard.press('Enter');

        res.json({ success: true, data });
    } catch (error) {
        if (error.message === 'VTME_NOT_OPEN') {
            return res.status(404).json({ error: 'Abra o VTME pelo menu lateral primeiro.' });
        }
        console.error(error);
        res.status(500).json({ error: 'Erro na planilha' });
    }
});

let browser = null;
let context = null;

async function initBrowser() {
    if (!browser) {
        console.log("🚀 Iniciando Microsoft Edge com perfil persistente...");
        const userDataPath = path.join(process.cwd(), 'user_data');
        context = await chromium.launchPersistentContext(userDataPath, {
            headless: false,
            channel: 'msedge',
            args: [
                '--start-maximized',
                '--use-fake-ui-for-media-stream',
                '--disable-blink-features=AutomationControlled'
            ],
            viewport: null,
            permissions: ['microphone', 'camera', 'notifications', 'clipboard-read', 'clipboard-write']
        });
        browser = context;

        // Fecha abas em branco que o Edge abre automaticamente no startup
        const pages = context.pages();
        for (const p of pages) {
            if (p.url() === 'about:blank' || p.url() === '') {
                await p.close().catch(() => {});
            }
        }

        // Listener para ver logs do navegador no terminal do Node
        context.on('page', p => {
            p.on('console', msg => console.log(`[BROWSER] ${msg.text()}`));
        });
        pages.forEach(p => {
            p.on('console', msg => console.log(`[BROWSER] ${msg.text()}`));
        });
    }
    return context;
}

app.get('/open-vtme', async (req, res) => {
    try {
        const ctx = await initBrowser();
        const pages = ctx.pages();
        let vtmePage = pages.find(p => p.url().includes('orbitsistemas.com.br'));
        
        if (!vtmePage) {
            vtmePage = await ctx.newPage();
            console.log("🚀 Abrindo VTME via menu lateral...");
            await vtmePage.goto('https://vtme2.orbitsistemas.com.br/agstelecom_v2/index.html#/pedido/gerenciarPedido', { waitUntil: 'load', timeout: 60000 });
        } else {
            console.log("📂 VTME já aberto, trazendo para frente...");
            await vtmePage.bringToFront();
        }
        res.json({ success: true });
    } catch (error) {
        console.error("Erro ao abrir VTME:", error);
        res.status(500).json({ error: 'Erro ao abrir VTME' });
    }
});

app.get('/open-tim', async (req, res) => {
    try {
        const ctx = await initBrowser();
        const pages = ctx.pages();
        let timPage = pages.find(p => p.url().includes('apptimvendas.timbrasil.com.br'));
        
        if (!timPage) {
            timPage = await ctx.newPage();
            console.log("🚀 Abrindo App Tim Vendas via menu lateral...");
            await timPage.goto('https://apptimvendas.timbrasil.com.br/#/login', { waitUntil: 'load', timeout: 60000 });
        } else {
            console.log("📂 App Tim Vendas já aberto, trazendo para frente...");
            await timPage.bringToFront();
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao abrir Tim Vendas' });
    }
});

app.get('/extract-tim', async (req, res) => {
    try {
        const ctx = await initBrowser();
        const pages = ctx.pages();
        let timPage = pages.find(p => p.url().includes('apptimvendas.timbrasil.com.br'));
        if (!timPage) return res.status(404).json({ error: 'Abra o App Tim Vendas primeiro.' });

        await timPage.bringToFront();
        console.log("🚀 Iniciando Extração Manual TIM VENDAS (Scraping Puro)...");

        // --- PASSO ÚNICO: EXTRAÇÃO DA LISTA JÁ CARREGADA ---
        const finalResults = await timPage.evaluate(async () => {
            const delay = (ms) => new Promise(r => setTimeout(r, ms));
            const resultsMap = new Map();
            const scrollContainer = document.querySelector('page-detailed-view .scroll-content') || document.documentElement;
            
            // Pega todos os itens que o usuário já carregou na tela
            let items = Array.from(document.querySelectorAll('page-detailed-view ion-list ion-item'));
            console.log(`📦 Detectados ${items.length} itens para extração...`);

            for (let i = 0; i < items.length; i++) {
                const card = items[i];
                if (!card) continue;

                // Extração dos dados básicos (Visíveis sem expandir)
                const cardTotalText = card.innerText;
                const rows = Array.from(card.querySelectorAll('ion-row[outter-row]'));
                const ordem = rows[1]?.innerText.match(/1-\d+/)?.[0] || `TEMP_${Date.now()}_${i}`;
                
                const col1 = rows[0]?.querySelector('ion-col[col-6]');
                const divsCol1 = col1 ? Array.from(col1.querySelectorAll('div')) : [];
                const cpf = divsCol1[0]?.innerText.trim() || '--';
                const nome = divsCol1[1]?.innerText.trim() || '--';
                const dataVenda = rows[0]?.querySelector('ion-col[text-right]')?.innerText.trim() || '--';

                // Só processa se for "Em andamento"
                if (!cardTotalText.toLowerCase().includes('em andamento')) continue;

                console.log(`🔎 Processando (${i+1}/${items.length}): ${ordem}`);

                let dataInst = '--', statusInst = '--';

                // Scroll para garantir que o item está na zona clicável
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await delay(800);

                const chevron = card.querySelector('.icon-drop-detailed, ion-icon[name*="arrow"], .button-inner ion-icon');
                
                if (chevron) {
                    let success = false;
                    let attempts = 0;
                    const MAX_ATTEMPTS = 3;

                    while (attempts < MAX_ATTEMPTS && !success) {
                        try {
                            // Tira qualquer bloqueio e clica
                            chevron.click();
                            
                            // Espera progressiva conforme as tentativas
                            await delay(3000 + (attempts * 1000)); 

                            // Tenta encontrar os dados usando vários métodos de busca
                            const findValueHeavy = () => {
                                // Pega todos os elementos de texto do card
                                const allElements = Array.from(card.querySelectorAll('ion-col, ion-row, div, span, b, p'));
                                let d = '--', s = '--';

                                for (let j = 0; j < allElements.length; j++) {
                                    const el = allElements[j];
                                    const txt = el.innerText.trim();

                                    // Busca Data
                                    if (txt.toLowerCase().includes('agendada para') || txt.toLowerCase().includes('data agendada')) {
                                        let val = "";
                                        if (txt.includes(':')) val = txt.split(':')[1].trim();
                                        else if (allElements[j+1]) val = allElements[j+1].innerText.trim();
                                        
                                        if (val && val.length > 5 && !val.toLowerCase().includes('falha')) d = val;
                                    }

                                    // Busca Status
                                    if (txt.toLowerCase().includes('status da instalação') || (txt.toLowerCase().includes('status inst') && !txt.toLowerCase().includes('agendada'))) {
                                        let val = "";
                                        if (txt.includes(':')) val = txt.split(':')[1].trim();
                                        else if (allElements[j+1]) val = allElements[j+1].innerText.trim();

                                        if (val && val.length > 2 && !val.toLowerCase().includes('falha')) s = val;
                                    }
                                }
                                return { d, s };
                            };

                            const { d, s } = findValueHeavy();
                            dataInst = d;
                            statusInst = s;

                            // Verifica se conseguimos dados reais
                            if (dataInst !== '--' && !dataInst.toLowerCase().includes('falha')) {
                                success = true;
                                console.log(`✅ Sucesso para: ${ordem}`);
                            } else {
                                console.log(`⚠️ Tentativa ${attempts + 1} falhou para ${ordem}. Retentando...`);
                                // Fecha e abre de novo para forçar o sistema do App Tim a atualizar
                                chevron.click();
                                await delay(1000);
                                attempts++;
                            }

                            // Só fecha o card se terminou com sucesso ou esgotou tentativas
                            if (success) {
                                chevron.click();
                                await delay(300);
                            }
                        } catch (e) {
                            attempts++;
                        }
                    }
                }

                resultsMap.set(ordem, { 
                    nome, 
                    cpf, 
                    ordem, 
                    data: dataVenda, 
                    status: 'Em andamento', 
                    datainst: dataInst, 
                    statusinst: statusInst 
                });
            }

            console.log(`✅ Extração Manual finalizada com ${resultsMap.size} itens.`);
            return Array.from(resultsMap.values());
        });

        res.json({ success: true, data: finalResults });
    } catch (error) {
        console.error("Erro Extração Manual TIM:", error);
        res.status(500).json({ error: error.message });
    }
});

// ===== AUTO EXTRAÇÃO TIM VENDAS (Igual ao VTME Auto) =====
let isExtractingTim = false;
let processedTimOrders = new Set();

// Limpa a memória a cada 30 min para re-checar status
setInterval(() => {
    console.log("♻️ Limpando cache de pedidos TIM processados...");
    processedTimOrders.clear();
}, 1800000);

app.get('/extract-tim-auto', async (req, res) => {
    if (isExtractingTim) {
        return res.json({ success: false, message: 'Robô TIM ocupado...' });
    }

    isExtractingTim = true;
    try {
        // Verifica se o Tim Vendas está aberto
        if (!browser) {
            return res.json({ success: true, data: [], message: 'Navegador não iniciado ainda.' });
        }
        const ctx = browser;
        const pages = ctx.pages();
        const timPage = pages.find(p => p.url().includes('apptimvendas.timbrasil.com.br'));

        if (!timPage) {
            return res.json({ success: true, data: [], message: 'App Tim Vendas não está aberto.' });
        }

        // Detecta se está na tela de login (não logado ainda)
        const currentUrl = timPage.url();
        const isLoginPage = currentUrl.includes('/login') || currentUrl.includes('#/login');
        const hasLoginForm = await timPage.evaluate(() => {
            const pwd = document.querySelector('input[type="password"]');
            if (!pwd) return false;
            const style = window.getComputedStyle(pwd);
            return style.display !== 'none' && style.visibility !== 'hidden' && pwd.offsetWidth > 0;
        });

        if (isLoginPage || hasLoginForm) {
            console.log("⏳ TIM Vendas: aguardando login do usuário...");
            return res.json({ success: true, data: [], message: 'Aguardando login no App Tim Vendas...' });
        }

        console.log("🚀 TIM Auto: usuário logado, iniciando extração automática...");

        const jaProcessados = Array.from(processedTimOrders);

        // Navega para visualização detalhada com filtros
        await timPage.evaluate(async () => {
            const delay = (ms) => new Promise(r => setTimeout(r, ms));

            const menuBtn = document.querySelector('button[menutoggle]');
            if (menuBtn) { menuBtn.click(); await delay(800); }

            const pedidosBtn = Array.from(document.querySelectorAll('ion-item, .item, button')).find(el =>
                el.innerText.toLowerCase().includes('pedidos cadastrados'));
            if (pedidosBtn) { pedidosBtn.click(); await delay(1500); }

            const detailedBtn = Array.from(document.querySelectorAll('ion-item, .item, button')).find(el =>
                el.innerText.toLowerCase().includes('visualização detalhada') || el.innerText.toLowerCase().includes('detalhada'));
            if (detailedBtn) { detailedBtn.click(); await delay(2000); }

            // Aplica filtro "Em andamento"
            const filterBtns = Array.from(document.querySelectorAll('button'));
            const statusFilter = filterBtns.find(b => b.innerText.toLowerCase().includes('status') || b.innerText.toLowerCase().includes('filtrar'));
            if (statusFilter) {
                statusFilter.click();
                await delay(800);
                const emAndamento = Array.from(document.querySelectorAll('ion-label, label, span, div')).find(el =>
                    el.innerText.toLowerCase().trim() === 'em andamento');
                if (emAndamento) { emAndamento.click(); await delay(1000); }
            }
        });

        await timPage.waitForTimeout(3000);

        // Extrai todos os pedidos "Em andamento"
        const finalResults = await timPage.evaluate(async (alreadyProcessed) => {
            const delay = (ms) => new Promise(r => setTimeout(r, ms));
            const resultsMap = new Map();
            const scrollContainer = document.querySelector('page-detailed-view .scroll-content') || document.documentElement;
            let canLoadMore = true;
            let lastProcessedCount = 0;

            while (canLoadMore) {
                let itemsThisPage = Array.from(document.querySelectorAll('page-detailed-view ion-list ion-item'));
                console.log(`📦 Auto TIM - Lote: ${itemsThisPage.length} itens.`);

                for (let i = lastProcessedCount; i < itemsThisPage.length; i++) {
                    const card = itemsThisPage[i];
                    if (!card) continue;

                    const cardText = card.innerText.toLowerCase();
                    if (!cardText.includes('em andamento')) continue;

                    const rows = Array.from(card.querySelectorAll('ion-row[outter-row]'));
                    const ordem = rows[1]?.innerText.match(/1-\d+/)?.[0] || `TEMP_${Date.now()}_${i}`;

                    if (resultsMap.has(ordem) || alreadyProcessed.includes(ordem)) continue;

                    const col1 = rows[0]?.querySelector('ion-col[col-6]');
                    const divsCol1 = col1 ? Array.from(col1.querySelectorAll('div')) : [];
                    const cpf = divsCol1[0]?.innerText.trim() || '--';
                    const nome = divsCol1[1]?.innerText.trim() || '--';
                    const dataVenda = rows[0]?.querySelector('ion-col[text-right]')?.innerText.trim() || '--';

                    const freshCard = Array.from(document.querySelectorAll('page-detailed-view ion-list ion-item')).find(el => el.innerText.includes(ordem));
                    let dataInst = '--', statusInst = '--';

                    if (freshCard) {
                        freshCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        await delay(700);
                        const chevron = freshCard.querySelector('.icon-drop-detailed, ion-icon[name*="arrow"]');
                        if (chevron) {
                            let attempts = 0;
                            const MAX_ATTEMPTS = 4; // ← 4 tentativas
                            while (attempts < MAX_ATTEMPTS) {
                                chevron.click();
                                await delay(3000); // ← 3s de espera
                                const expanded = Array.from(document.querySelectorAll('page-detailed-view ion-list ion-item')).find(el => el.innerText.includes(ordem));
                                if (!expanded) { attempts++; continue; }

                                const lines = expanded.innerText.split('\n').map(t => t.trim());
                                const findVal = (lbl) => {
                                    const idx = lines.findIndex(t => t.includes(lbl));
                                    if (idx !== -1) {
                                        if (lines[idx].includes(':')) return lines[idx].split(':')[1].trim() || '--';
                                        return lines[idx + 1] || '--';
                                    }
                                    return '--';
                                };

                                dataInst = findVal('Data Agendada para Instalação');
                                statusInst = findVal('Status da Instalação');

                                // Se não for falha e não for vazio, sucesso!
                                if (dataInst !== '--' && !dataInst.toLowerCase().includes('falha')) {
                                    chevron.click(); await delay(600); break;
                                } else {
                                    if (attempts < MAX_ATTEMPTS - 1) {
                                        chevron.click();
                                        await delay(1500 * (attempts + 1)); 
                                        attempts++;
                                    } else {
                                        chevron.click(); await delay(600); break;
                                    }
                                }
                            }


                        }
                    }

                    resultsMap.set(ordem, { nome, cpf, ordem, data: dataVenda, status: 'Em andamento', datainst: dataInst, statusinst: statusInst });
                }

                lastProcessedCount = itemsThisPage.length;

                const loadMoreBtn = Array.from(document.querySelectorAll('button, ion-button')).find(b =>
                    b.innerText.toLowerCase().includes('carregar próximos') || b.innerText.toLowerCase().includes('carregar mais'));

                if (loadMoreBtn && loadMoreBtn.offsetParent !== null) {
                    console.log('➕ Auto TIM: carregando próximos pedidos...');
                    loadMoreBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    await delay(800);
                    loadMoreBtn.click();

                    // Espera INTELIGENTE: aguarda até os itens aparecerem (máx 30s)
                    let waited = 0;
                    while (waited < 30000) {
                        await delay(1000);
                        waited += 1000;
                        const nowCount = Array.from(document.querySelectorAll('page-detailed-view ion-list ion-item')).length;
                        if (nowCount > lastProcessedCount) {
                            await delay(2000); // Aguarda a estabilização do DOM
                            console.log(`✅ Auto TIM: ${nowCount} itens. Continuando...`);
                            break;
                        }
                    }

                    const finalCount = Array.from(document.querySelectorAll('page-detailed-view ion-list ion-item')).length;
                    scrollContainer.scrollBy(0, 200);
                    await delay(500);
                    canLoadMore = finalCount > lastProcessedCount;
                } else {
                    canLoadMore = false;
                }

                if (resultsMap.size > 5000) break; // Aumentado limite de segurança para suportar carregamento de todas as informações
            }

            console.log(`✅ Auto TIM: ${resultsMap.size} pedidos extraídos.`);
            return Array.from(resultsMap.values());
        }, jaProcessados);

        // Atualiza a memória de pedidos processados
        for (const item of finalResults) {
            if (item.ordem) processedTimOrders.add(item.ordem);
        }

        if (finalResults.length > 0) {
            console.log(`✅ Auto TIM: ${finalResults.length} novos pedidos processados.`);
        } else {
            console.log("🟡 Auto TIM: Nenhum pedido novo encontrado.");
        }

        res.json({ success: true, data: finalResults });
    } catch (error) {
        console.error("Erro Auto TIM:", error);
        res.status(500).json({ error: error.message });
    } finally {
        isExtractingTim = false;
    }
});

app.post('/macro-tim', async (req, res) => {
    try {
        const payload = req.body.data;
        if (!payload) return res.status(400).json({ error: 'Nenhum dado fornecido' });

        // Carrega o histórico de pedidos lançados
        const LAUNCHED_ORDERS_FILE = path.join(process.cwd(), 'launched_tim_orders.json');
        let launchedList = [];
        if (fs.existsSync(LAUNCHED_ORDERS_FILE)) {
            try {
                launchedList = JSON.parse(fs.readFileSync(LAUNCHED_ORDERS_FILE, 'utf-8'));
            } catch (e) {
                console.error("Erro ao ler launched_tim_orders.json:", e);
            }
        }

        const rawItems = Array.isArray(payload) ? payload : [payload];
        const items = rawItems.filter(item => {
            const key = (item.ordem && item.ordem !== '--') ? item.ordem : (item.id || item.nome);
            return key && !launchedList.includes(key);
        });

        if (items.length === 0) {
            console.log("🟡 Nenhum pedido novo para lançar na planilha.");
            return res.json({ success: true, count: 0 });
        }

        const ctx = await initBrowser();
        const pages = ctx.pages();
        
        // Link da Planilha Macro configurada pelo usuário ou fallback
        let sheetUrl = req.body.sheetUrl || "https://excel.cloud.microsoft/open/onedrive/?docId=D7954F0A2A4EFE88%21s2528d66f763f4b8da594141c18e1da1c&driveId=D7954F0A2A4EFE88"; 
        
        // Identificação via ID único da planilha para não confundir com outras
        let uniqueIdentifier = 's2528d66f763f4b8da594141c18e1da1c';
        let decodedIdentifier = 's2528d66f763f4b8da594141c18e1da1c';
        
        if (req.body.sheetUrl) {
            const docIdMatch = req.body.sheetUrl.match(/docId=([^&]+)/) || req.body.sheetUrl.match(/driveId=([^&]+)/);
            if (docIdMatch) {
                uniqueIdentifier = docIdMatch[1];
                try {
                    decodedIdentifier = decodeURIComponent(uniqueIdentifier);
                } catch(e) {
                    decodedIdentifier = uniqueIdentifier;
                }
            } else {
                const pathMatch = req.body.sheetUrl.match(/\/([A-Za-z0-9_-]{12,})\b/);
                if (pathMatch) {
                    uniqueIdentifier = pathMatch[1];
                    decodedIdentifier = uniqueIdentifier;
                }
            }
        }

        let sheetPage = pages.find(p => {
            const url = p.url();
            if (url.includes(uniqueIdentifier) || url.includes(decodedIdentifier)) return true;
            const cleanId = uniqueIdentifier.split('%21').pop().split('!').pop();
            if (cleanId && cleanId.length > 5 && url.includes(cleanId)) return true;
            return false;
        });
        
        if (!sheetPage) {
            sheetPage = await ctx.newPage();
            console.log("🚀 Abrindo Planilha Macro...");
            await sheetPage.goto(sheetUrl, { waitUntil: 'load', timeout: 60000 });
            await sheetPage.waitForTimeout(8000); 
        } else {
            console.log("📂 Planilha Macro já aberta, trazendo para frente...");
            await sheetPage.bringToFront();
        }

        console.log(`Preenchendo a Planilha Macro com ${items.length} novo(s) pedido(s)...`);
        
        // 1. Ir para A1 (topo)
        await sheetPage.keyboard.press('Control+Home');
        await sheetPage.waitForTimeout(500);
        
        // 2. Descer para A2 (primeira linha de dados potencial)
        await sheetPage.keyboard.press('ArrowDown');
        await sheetPage.waitForTimeout(200);
        
        // 3. Copiar e verificar se A2 está vazia
        await sheetPage.keyboard.press('Control+c');
        await sheetPage.waitForTimeout(200);
        let cellContent = await sheetPage.evaluate(async () => {
            try { return await navigator.clipboard.readText(); } catch (e) { return ''; }
        });
        
        const isA2Filled = cellContent && cellContent.trim().length > 0;
        if (isA2Filled) {
            // 4. Se A2 está preenchida, agora é seguro usar Ctrl+ArrowDown para pular ao fim dos dados
            console.log('A2 preenchida. Dando Ctrl+Down para pular ao fim dos dados...');
            await sheetPage.keyboard.press('Control+ArrowDown');
            await sheetPage.waitForTimeout(300);
            
            // 5. Desce 1 linha para a primeira vazia
            await sheetPage.keyboard.press('ArrowDown');
            await sheetPage.waitForTimeout(200);
            
            // Volta para a coluna A (Home)
            await sheetPage.keyboard.press('Home');
            await sheetPage.waitForTimeout(200);
            
            // 6. Verificação final com busca incremental curta de segurança
            await sheetPage.keyboard.press('Control+c');
            await sheetPage.waitForTimeout(200);
            cellContent = await sheetPage.evaluate(async () => {
                try { return await navigator.clipboard.readText(); } catch (e) { return ''; }
            });
            
            if (cellContent && cellContent.trim().length > 0) {
                console.log('⚠️ Ctrl+Down não parou em célula vazia. Fazendo busca incremental...');
                for (let i = 0; i < 200; i++) {
                    await sheetPage.keyboard.press('ArrowDown');
                    await sheetPage.waitForTimeout(50);
                    await sheetPage.keyboard.press('Control+c');
                    await sheetPage.waitForTimeout(100);
                    const check = await sheetPage.evaluate(async () => {
                        try { return await navigator.clipboard.readText(); } catch (e) { return ''; }
                    });
                    if (!check || check.trim().length === 0) {
                        console.log(`✅ Linha vazia encontrada após ${i + 1} passos incrementais.`);
                        break;
                    }
                }
            }
        } else {
            console.log('✅ A2 está vazia, iniciando inserção a partir da linha 2.');
        }
        
        // Agora estamos estritamente na primeira célula em branco da Coluna A.
        for (const item of items) {
            // Monta as 14 colunas exatas exigidas pela interface
            const fields = [
                item.nome,           // Coluna A: NOME DO CLIENTE
                item.cpf,            // Coluna B: CPF
                item.uf,             // Coluna C: UF
                item.ordem,          // Coluna D: ORDEM DE VENDA
                item.data,           // Coluna E: DATA VENDA
                item.bio,            // Coluna F: BIOMETRIA
                item.status,         // Coluna G: STATUS GERAL
                item.infraco,        // Coluna H: INFRACO
                item.plano,          // Coluna I: PLANO
                item.valorPlano,     // Coluna J: VALOR DO PLANO
                item.datainst,       // Coluna K: AGENDAMENTO INST.
                item.statusinst,     // Coluna L: STATUS INST.
                item.consultor,      // Coluna M: CONSULTOR
                item.supervisor      // Coluna N: SUPERVISOR
            ];

            // Digita coluna por coluna
            for (const f of fields) {
                // Filtro para garantir que é texto e preenche
                const textToType = (f === '--' || !f) ? '--' : String(f);
                await sheetPage.keyboard.type(textToType);
                await sheetPage.keyboard.press('Tab');
                await sheetPage.waitForTimeout(200);
            }
            
            // Dá o comando do enter para Excel pular de linha e reseta o cursor pra Coluna A da linha nova
            await sheetPage.keyboard.press('Enter');
            await sheetPage.waitForTimeout(400);
            await sheetPage.keyboard.press('Home'); // Medida de segurança pra forçar voltar na Coluna A
            await sheetPage.waitForTimeout(400);
        }

        // Salva os novos itens no histórico de lançados
        items.forEach(item => {
            const key = (item.ordem && item.ordem !== '--') ? item.ordem : (item.id || item.nome);
            if (key) {
                launchedList.push(key);
            }
        });
        try {
            fs.writeFileSync(LAUNCHED_ORDERS_FILE, JSON.stringify(launchedList, null, 2), 'utf-8');
        } catch (e) {
            console.error("Erro ao salvar lançado em launched_tim_orders.json:", e);
        }

        res.json({ success: true, count: items.length });
    } catch (error) {
        console.error("Erro ao preencher Macro:", error);
        res.status(500).json({ error: 'Erro ao preencher Macro' });
    }
});


async function getVTMEPage() {
    try {
        const ctx = await initBrowser();
        let pages = ctx.pages();
        let vtmePage = pages.find(p => p.url().includes('orbitsistemas.com.br'));
        
        if (!vtmePage) {
            // Se não estiver aberto, não abrimos mais automaticamente
            throw new Error('VTME_NOT_OPEN');
        }
        
        return vtmePage;
    } catch (error) {
        if (error.message === 'VTME_NOT_OPEN') throw error;
        console.log("Erro ao recuperar navegador, reiniciando...");
        browser = null;
        return getVTMEPage();
    }
}

app.get('/fetch-onedrive-contacts', async (req, res) => {
    const spreadsheetUrl = "https://onedrive.live.com/:x:/g/personal/0dd5456ada276c57/IQBzolG7QpUPRLm_isfxRMQeAR1yOhcJsbUPpXkh1dMmirw?rtime=60gg6ayX3kg&nav=MTVfezYxQUUzRjk2LUQwN0YtNDdEOC04MTA5LTU5RDY4NkZGOUIyOH0&redeem=aHR0cHM6Ly8xZHJ2Lm1zL3gvYy8wZGQ1NDU2YWRhMjc2YzU3L0lRQnpvbEc3UXBVUFJMbV9pc2Z4Uk1RZUFSMXlPaGNKc2JVUHBYa2gxZE1taXJ3P2U9ODhNS2hEJm5hdj1NVFZmZXpZeFFVVXpSamsyTFVRd04wWXRORGRFT0MwNE1UQTVMVFU1UkRZNE5rWkdPVUl5T0gw";
    
    try {
        const ctx = await initBrowser();
        const page = await ctx.newPage();
        console.log("Abrindo OneDrive para extração de contatos...");
        await page.goto(spreadsheetUrl, { waitUntil: 'load', timeout: 90000 });
        
        // Aguarda a renderização inicial do Excel
        await page.waitForTimeout(10000);

        const contacts = await page.evaluate(() => {
            const phoneRegex = /(\(?\d{2}\)?\s?\d\s?\d{4}-?\d{4})/g;
            const cells = Array.from(document.querySelectorAll('.ewa-grid-cell, td, span, div'));
            const foundNumbers = new Set();
            
            for (const cell of cells) {
                const text = cell.innerText.trim();
                const match = text.match(phoneRegex);
                if (match) {
                    match.forEach(num => {
                        const clean = num.replace(/\D/g, '');
                        if (clean.length >= 10 && clean.length <= 11) {
                            foundNumbers.add(clean);
                        }
                    });
                }
                if (foundNumbers.size >= 20) break;
            }
            return Array.from(foundNumbers).map(num => ({ number: num, sent: false }));
        });

        await page.close();
        res.json(contacts);
    } catch (error) {
        console.error("Erro ao buscar contatos do OneDrive:", error);
        res.status(500).json({ error: 'Erro ao extrair contatos da planilha' });
    }
});

app.get('/open-3c', async (req, res) => {
    try {
        const ctx = await initBrowser();
        const page = await ctx.newPage();
        await page.goto('https://agstelecom.3c.plus/', { waitUntil: 'domcontentloaded' });
        res.json({ success: true, message: '3C Plus aberto no navegador do robô' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao abrir 3C Plus' });
    }
});

app.get('/dial-3c', async (req, res) => {
    const { number } = req.query;
    if (!number) return res.status(400).json({ error: 'Número não fornecido' });

    try {
        const ctx = await initBrowser();
        const pages = ctx.pages();
        
        console.log(`\n--- 🕵️ PROCURANDO 3C PLUS (TENTATIVA ADAPTATIVA) ---`);
        let targetPage = null;
        
        for (const p of pages) {
            try {
                const url = p.url().toLowerCase();
                const title = (await p.title()).toLowerCase();
                console.log(`> Verificando: [${title}] - ${url}`);
                
                // Busca ampla: URL contém 3c.plus OU agstelecom OU título contém 3c plus
                if (url.includes('3c.plus') || url.includes('agstelecom') || title.includes('3c plus')) {
                    targetPage = p;
                    // Prioridade máxima para a tela do agente
                    if (url.includes('/agent') || title.includes('agente')) {
                        console.log(`🎯 Perfeito! Aba do Agente encontrada.`);
                        break;
                    }
                }
            } catch (e) { }
        }

        if (!targetPage) {
            console.log("❌ ERRO: Não encontrei nenhuma aba do 3C Plus aberta no navegador do robô.");
            return res.json({ 
                status: '3C_OPENED', 
                message: '3C Plus não detectado. Abra-o pelo botão lateral do sistema e faça login.' 
            });
        }

        const cleanNum = number.replace(/\D/g, '');
        console.log(`🚀 Iniciando discagem 'Fix Definitivo' para: ${cleanNum}`);
        
        try {
            await targetPage.bringToFront();
            await targetPage.waitForTimeout(800);
            
            // Limpa possíveis bloqueios (como modais ou avisos)
            await targetPage.keyboard.press('Escape');
            await targetPage.waitForTimeout(300);

            const dialSelectors = [
                "input.phone-input", 
                "input[placeholder*='ligar']",
                "input[data-testid='dialer-input']", 
                "input#phone",               
                "input[type='tel']",
                "input.form-control",
                "input"
            ];

            let dialed = false;
            const allFrames = targetPage.frames();
            
            for (const frame of allFrames) {
                for (const s of dialSelectors) {
                    try {
                        const locator = frame.locator(s).first();
                        if (await locator.count() > 0 && await locator.isVisible({ timeout: 500 })) {
                            console.log(`⌨️ Campo de discagem encontrado via seletor: ${s}`);
                            
                            // Ação reforçada de limpeza e preenchimento
                            await locator.click({ force: true });
                            await targetPage.waitForTimeout(200);
                            await targetPage.keyboard.press('Control+A');
                            await targetPage.keyboard.press('Backspace');
                            await targetPage.waitForTimeout(300);
                            
                            await targetPage.keyboard.type(cleanNum, { delay: 70 });
                            await targetPage.waitForTimeout(500);
                            await targetPage.keyboard.press('Enter');
                            
                            dialed = true;
                            break;
                        }
                    } catch (e) {}
                }
                if (dialed) break;
            }

            if (!dialed) {
                console.log("⚠️ Nenhum campo detectado via seletor. Tentando digitação direta...");
                await targetPage.mouse.click(200, 200); // Clica em área neutra para foco
                await targetPage.keyboard.type(cleanNum, { delay: 100 });
                await targetPage.keyboard.press('Enter');
            }

            // Tenta clicar no botão Ligar para garantir
            await targetPage.waitForTimeout(1000);
            const callSelectors = [
                "button:has-text('Ligar')", 
                "button:has-text('Discar')", 
                "button[aria-label*='Ligar']",
                "button[title*='Ligar']",
                "button.btn-success",
                ".call-button",
                "button"
            ];

            for (const frame of allFrames) {
                for (const cSel of callSelectors) {
                    try {
                        const btn = frame.locator(cSel).first();
                        if (await btn.count() > 0 && await btn.isVisible({ timeout: 300 })) {
                            const isDisabled = await btn.getAttribute('disabled');
                            if (isDisabled === null) {
                                await btn.click({ force: true });
                                console.log(`☎️ Botão ligar acionado!`);
                                return res.json({ success: true });
                            }
                        }
                    } catch(e) {}
                }
            }

            res.json({ success: true, message: 'Discagem realizada.' });

        } catch (error) {
            console.error("Erro interno no dialer:", error);
            res.status(500).json({ error: 'Erro ao processar discagem' });
        }
    } catch (error) {
        console.error("Erro crítico no bridge:", error);
        res.status(500).json({ error: 'Erro interno na ponte' });
    }
});

app.get('/open-whatsapp', async (req, res) => {
    try {
        const ctx = await initBrowser();
        const pages = ctx.pages();
        let waPage = pages.find(p => p.url().includes('web.whatsapp.com'));
        
        if (!waPage) {
            waPage = await ctx.newPage();
            console.log("🚀 Abrindo WhatsApp Web via menu lateral...");
            await waPage.goto('https://web.whatsapp.com', { waitUntil: 'load', timeout: 60000 });
        } else {
            console.log("📂 WhatsApp já aberto, trazendo para frente...");
            await waPage.bringToFront();
        }
        res.json({ success: true });
    } catch (error) {
        console.error("Erro ao abrir WhatsApp:", error);
        res.status(500).json({ error: 'Erro ao abrir WhatsApp' });
    }
});

app.get('/send-whatsapp', async (req, res) => {
    const { number, message } = req.query;
    if (!number || !message) return res.status(400).json({ error: 'Número ou mensagem não fornecidos' });

    try {
        const ctx = await initBrowser();
        const pages = ctx.pages();
        let waPage = pages.find(p => p.url().includes('web.whatsapp.com'));
        
        if (!waPage) {
            console.log("⚠️ WhatsApp não encontrado aberto. Abrindo agora...");
            waPage = await ctx.newPage();
            await waPage.goto('https://web.whatsapp.com', { waitUntil: 'load', timeout: 60000 });
            // Dá tempo para o usuário logar caso não esteja
            await waPage.waitForSelector('#pane-side, canvas', { timeout: 15000 }).catch(() => {});
        } else {
            // await waPage.bringToFront(); // Desativado para não atrapalhar o seu trabalho em outras abas
        }

        const cleanNum = number.replace(/\D/g, '');
        const finalNum = cleanNum.length <= 11 ? `55${cleanNum}` : cleanNum;
        
        console.log(`✉️ Navegando para envio: ${finalNum}...`);
        
        const waUrl = `https://web.whatsapp.com/send?phone=${finalNum}&text=${encodeURIComponent(message)}`;
        await waPage.goto(waUrl);
        
        const sendBtnSelectors = [
            'span[data-icon="send"]',
            '[data-testid="compose-btn-send"]',
            'button:has(span[data-icon="send"])'
        ];
        
        const invalidNumberSelector = 'div[data-animate-modal-body="true"]:has-text("inválido")';
        const okButton = 'div[role="button"]:has-text("OK")';

        console.log("⏳ Aguardando interface do WhatsApp responder...");
        
        // 1. Detectar se o número é inválido ou se o chat carregou
        const status = await Promise.race([
            waPage.waitForSelector(sendBtnSelectors.join(','), { timeout: 30000 }).then(() => 'READY'),
            waPage.waitForSelector(invalidNumberSelector, { timeout: 30000 }).then(() => 'INVALID'),
            waPage.waitForSelector('div[contenteditable="true"]', { timeout: 30000 }).then(() => 'READY')
        ]).catch(() => 'TIMEOUT');

        if (status === 'INVALID') {
            console.log(`❌ Número ${finalNum} INVÁLIDO.`);
            try { await waPage.click(okButton, { timeout: 2000 }); } catch(e) {}
            return res.status(400).json({ error: 'Número inválido', status: 'INVALID' });
        }

        // 2. Tentar Enviar
        console.log("⌨️ Ativando campo de mensagem (Simulando Humano)...");
        const chatInput = 'div[contenteditable="true"]';
        try {
            await waPage.waitForSelector(chatInput, { timeout: 10000 });
            await waPage.click(chatInput);
            await waPage.waitForTimeout(500);
            
            // Simulação de digitação para o botão "acordar"
            await waPage.keyboard.type(' ');
            await waPage.keyboard.press('Backspace');
            await waPage.waitForTimeout(800);
            
            // Tenta o Enter primeiro que é mais rápido
            console.log("🚀 Disparando mensagem...");
            await waPage.keyboard.press('Enter');
            
            // Verifica se o botão de enviar ainda existe (se existir, o Enter falhou)
            await waPage.waitForTimeout(1000);
            for (const selector of sendBtnSelectors) {
                const btn = waPage.locator(selector).first();
                if (await btn.count() > 0 && await btn.isVisible()) {
                    await btn.click({ force: true });
                    console.log(`✅ Clique no botão (${selector}) reforçado!`);
                }
            }

            await waPage.waitForTimeout(2000);
            return res.json({ success: true });

        } catch (e) {
            console.error("Erro ao enviar:", e.message);
            res.status(500).json({ error: 'Falha no envio' });
        }
    } catch (error) {
        console.error("Erro no WhatsApp:", error);
        res.status(500).json({ error: 'Erro ao enviar WhatsApp' });
    }
});

// Conjunto para memorizar os contratos já processados
// Vamos limpar isso a cada 5 minutos para o robô re-checar status de cancelamento
let processedVTMEOrders = new Map(); // checkId -> attemptCount
setInterval(() => {
    console.log("♻️ Limpando cache de pedidos processados para re-atualização...");
    processedVTMEOrders.clear();
}, 300000); 

let isExtracting = false;

app.get('/extract-vtme-auto', async (req, res) => {
    if (isExtracting) {
        return res.json({ success: false, message: 'Robô ocupado processando a lista...' });
    }
    
    isExtracting = true;
    try {
        const page = await getVTMEPage();
        
        const currentUrl = page.url();
        console.log(`🌐 URL Atual do VTME: ${currentUrl}`);

        // Verificação de login mais rigorosa: só aciona se estiver explicitamente na página de login
        // ou se virmos um formulário de login visível.
        const isLoginPage = currentUrl.includes('/login');
        const hasVisiblePassword = await page.evaluate(() => {
            const pwd = document.querySelector('input[type="password"]');
            if (!pwd) return false;
            const style = window.getComputedStyle(pwd);
            return style.display !== 'none' && style.visibility !== 'hidden' && pwd.offsetWidth > 0;
        });

        if (isLoginPage || hasVisiblePassword) {
            console.log("⚠️ Robô detectou tela de login (Página de Login ou Campo de Senha Visível).");
            return res.json({ success: false, message: 'Aguardando Login no VTME...' });
        }

        // Tenta mudar a aba para Tim Fibra via injeção JS
        const aguardarCarregamento = await page.evaluate(() => {
             const tabs = Array.from(document.querySelectorAll('.tabResponsiva a, md-tab-item, .nav-link'));
             const timTab = tabs.find(el => el.innerText && el.innerText.toLowerCase().includes('tim fibra'));
             
             if (timTab) {
                 const parentLi = timTab.closest('li');
                 const isActive = (parentLi && parentLi.classList.contains('active')) || timTab.classList.contains('active');
                 
                 if (!isActive) {
                     console.log("🎯 Clicando na aba Pedidos Tim Fibra...");
                     timTab.click();
                     return true; 
                 }
             }
             return false;
        });

        if (aguardarCarregamento) {
            console.log("⏳ Aguardando carregamento da aba...");
            await page.waitForTimeout(4000); 
        } else {
            console.log("✅ Já na aba correta ou aba não encontrada.");
        }

        // Aumentar limite de linhas para 50
        await page.evaluate(() => {
            const select = document.querySelector('select[name="pageSize"], select[ng-model="pageSize"]');
            if (select) {
                select.value = '50';
                select.dispatchEvent(new Event('change'));
            }
        });
        await page.waitForTimeout(2000);
        const isActiveTimFibra = await page.evaluate(() => {
            const activeTabEl = Array.from(document.querySelectorAll('.tabResponsiva li.active a, md-tab-item.md-active, .nav-link.active, .nav-tabs .active, .nav-tabs li.active a'))
                                     .find(el => el.innerText && el.innerText.toLowerCase().includes('tim fibra'));
            return !!activeTabEl;
        });

        if (!isActiveTimFibra) {
            console.log("⏸️ [VTME RPA] Aba 'Tim Fibra' não está ativa. Pulando extração automática para evitar misturar com corporativo/móvel.");
            return res.json({ success: true, data: [] });
        }

        const jaProcessados = [];
        for (const [checkId, attempts] of processedVTMEOrders.entries()) {
            if (attempts >= 3) {
                jaProcessados.push(checkId);
            }
        }
        console.log(`🔍 Iniciando varredura profunda. Já processados hoje (com 3+ tentativas): ${jaProcessados.length}`);

        const extractedThisRound = await page.evaluate(async (alreadyProcessed) => {
            const results = [];
            let pagesProcessed = 0;
            const maxPages = 500; // Processamos até 500 páginas por vez para garantir todas as informações

            while (pagesProcessed < maxPages) {
                const getRows = () => Array.from(document.querySelectorAll('table[orb-relatorio-table] tbody tr, table.orb-gr2-table tbody tr, .ui-grid-row'));
                const allRows = getRows();
                console.log(`📊 Página ${pagesProcessed + 1}: ${allRows.length} linhas detectadas.`);
                
                let processedInThisPage = 0;

                for (let i = 0; i < allRows.length; i++) {
                    const rows = getRows();
                    const row = rows[i];
                    if (!row) continue;

                    const rowText = row.innerText || "";
                    const isHeader = rowText.includes('Cliente') && rowText.includes('CPF') && rowText.includes('Status');
                    if (isHeader || rowText.trim() === "" || rowText.includes('Nenhum registro')) continue;

                    const cpfMatch = rowText.match(/\d{3}\.\d{3}\.\d{3}\-\d{2}/) || rowText.match(/\b\d{11}\b/);
                    let checkId = cpfMatch ? cpfMatch[0] : null;
                    if (!checkId) {
                        const cells = Array.from(row.querySelectorAll('td, .ui-grid-cell, div'));
                        if (cells.length > 3) checkId = cells[1].innerText.trim() + cells[3].innerText.trim();
                    }

                    if (!checkId || alreadyProcessed.includes(checkId)) continue;

                    const viewBtn = row.querySelector('.orb-icone-pedido, [title*="Resumo" i], [uib-tooltip*="Resumo" i], .fa-file-text-o, .fa-eye');
                    let btnTarget = viewBtn ? (viewBtn.closest('button, a') || viewBtn.parentElement) : null;

                    if (!btnTarget) {
                        const allBtns = Array.from(row.querySelectorAll('button, a'));
                        btnTarget = allBtns.find(b => b.innerHTML.includes('pedido') || b.innerHTML.includes('file') || b.innerHTML.includes('resumo'));
                    }

                    if (!btnTarget) continue;

                    console.log("🤖 Abrindo contrato: " + checkId);
                    btnTarget.click();
                    
                    // Espera o modal abrir e carregar os dados (focando apenas no modal VISÍVEL e ATIVO)
                    await new Promise(async (resolve) => {
                        const startTime = Date.now();
                        while (Date.now() - startTime < 8000) {
                            const activeModal = Array.from(document.querySelectorAll('pedido-tim-fibra-modal, pedido-modal, orb-modal-v3, .modal-content'))
                                                     .find(el => el.offsetWidth > 0 && el.offsetHeight > 0);
                            if (activeModal) {
                                const hasDetails = activeModal.querySelector('orb-card-row-v3');
                                if (hasDetails) {
                                    break;
                                }
                            }
                            await new Promise(r => setTimeout(r, 300));
                        }
                        resolve();
                    });

                    const extractInfo = () => {
                        const getVal = (labelStr) => {
                            const modalEl = Array.from(document.querySelectorAll('pedido-tim-fibra-modal, pedido-modal, orb-modal-v3, .modal-content'))
                                                 .find(el => el.offsetWidth > 0 && el.offsetHeight > 0) || document;
                            const elements = Array.from(modalEl.querySelectorAll('label, b, strong, span, th, td'));
                            const target = elements.find(el => {
                                const txt = (el.innerText || "").trim().replace(':','').toLowerCase();
                                return txt === labelStr.toLowerCase();
                            });
                            if (!target) return "";
                            let valEl = target.nextElementSibling;
                            if (valEl && (valEl.innerText.trim() || valEl.value)) return (valEl.value || valEl.innerText).trim();
                            const parentTxt = (target.parentElement.innerText || "").replace(target.innerText, "").trim();
                            if (parentTxt.length > 2) return parentTxt;
                            if (target.tagName === 'TD' || target.parentElement.tagName === 'TD') {
                                const td = target.closest('td');
                                if (td && td.nextElementSibling) return td.nextElementSibling.innerText.trim();
                            }
                            return "";
                        };

                        const rawCliente = getVal('Cliente') || getVal('Nome') || "Desconhecido";
                        const cliente = rawCliente.toLowerCase() === 'cliente' ? 'Desconhecido' : rawCliente;
                        
                        let cpf = '--';
                        let cnpj = '--';
                        
                        const rawCpfVal = getVal('CPF');
                        if (rawCpfVal && rawCpfVal.toLowerCase() !== 'cpf') {
                            if (rawCpfVal.replace(/\D/g, '').length > 11) {
                                cnpj = rawCpfVal;
                            } else {
                                cpf = rawCpfVal;
                            }
                        }
                        
                        const rawCnpjVal = getVal('CNPJ');
                        if (rawCnpjVal && rawCnpjVal.toLowerCase() !== 'cnpj') {
                            if (rawCnpjVal.replace(/\D/g, '').length > 11) {
                                cnpj = rawCnpjVal;
                            }
                        }

                        // Fallback to checkId if neither is found
                        if (cpf === '--' && cnpj === '--') {
                            cpf = checkId;
                        }

                        const rawConsultor = getVal('Consultor') || getVal('Consultor(a)') || getVal('Vendedor') || "Consultor";
                        const consultor = rawConsultor.split('-')[0].trim();
                        
                        const rawSupervisor = getVal('Supervisor') || getVal('Supervisor(a)') || getVal('Lider') || "Supervisor";
                        const supervisor = rawSupervisor.split('-')[0].trim();
                        
                        const textContent = document.body.innerText.toLowerCase();
                        const isCanc = textContent.includes("cancelamento operação") || textContent.includes("cancelamento operacao");
                        
                        let bio = getVal('Biometria') || getVal('Bio');
                        if (!bio) {
                            const xpathBio1 = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-tim-fibra-modal/div[2]/pedido-tim-fibra-visualizar/div/div/div[3]/orb-card-v3/div/orb-card-row-v3[4]/div/div[2]/div/span[1]";
                            const xpathBio2 = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-tim-fibra-modal/div[2]/pedido-tim-fibra-visualizar/div/div/div[3]/orb-card-v3/div/orb-card-row-v3[4]/div/div[2]/div";
                            const bioEl = getElementByXPath(xpathBio1) || getElementByXPath(xpathBio2);
                            if (bioEl) {
                                let bioVal = bioEl.innerText.trim();
                                if (bioVal.toUpperCase().includes('BIOMETRIA')) {
                                    bioVal = bioVal.replace(/Biometria:/i, '').trim();
                                }
                                bio = bioVal;
                            }
                        }
                        
                        return { 
                            cliente, cpf, cnpj,
                            consultor: consultor === 'Consultor' ? 'Não Identificado' : consultor,
                            supervisor: supervisor === 'Supervisor' ? 'Não Identificado' : supervisor,
                            uf: document.body.innerText.match(/\/\s*([A-Z]{2})/)?.[1] || "--",
                            statusCanc: isCanc ? "SOLICITADO" : "PENDENTE",
                            bio: bio || '--',
                            checkId
                        };
                    };

                    const info = extractInfo();
                    const closeBtn = Array.from(document.querySelectorAll('.modal-footer button, .modal button, .close, .btn-default'))
                                        .find(b => b.innerText && /FECHAR|VOLTAR|SAIR/i.test(b.innerText));
                    if (closeBtn) closeBtn.click();
                    else document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));

                    await new Promise(r => setTimeout(r, 1200));

                    if (info.cliente !== "Desconhecido") {
                        results.push(info);
                        alreadyProcessed.push(checkId);
                        processedInThisPage++;
                    }
                }

                // Tenta ir para a próxima página
                const paginationBtns = Array.from(document.querySelectorAll('.pagination li a, .pagination button, .pager a'));
                const nextBtn = paginationBtns.find(b => b.innerText.trim() === '>' || b.innerText.includes('Próximo') || b.getAttribute('aria-label') === 'Next');
                
                if (nextBtn && !nextBtn.parentElement.classList.contains('disabled') && !nextBtn.hasAttribute('disabled')) {
                    console.log("⏭️ Indo para a próxima página...");
                    nextBtn.click();
                    pagesProcessed++;
                    await new Promise(r => setTimeout(r, 4000)); // Espera a nova página carregar
                } else {
                    console.log("🏁 Fim da paginação ou botão 'Próximo' não encontrado.");
                    break; 
                }
            }
            return results;
        }, jaProcessados);

        // Atualiza a memória de Set no backend Node
        // Atualiza a memória de Set no backend Node
        for (const item of extractedThisRound) {
            if (item.checkId) {
                const isFullyExtracted = item.consultor && item.consultor !== 'Não Identificado' && item.bio && item.bio !== '--';
                const currentAttempts = processedVTMEOrders.get(item.checkId) || 0;
                if (isFullyExtracted) {
                    processedVTMEOrders.set(item.checkId, 99); // Sucesso total, pula sempre
                } else {
                    processedVTMEOrders.set(item.checkId, currentAttempts + 1); // Incrementa tentativa
                }
            }
        }

        if (extractedThisRound.length > 0) {
            console.log(`✅ Sucesso! ${extractedThisRound.length} novos registros processados.`);
        } else {
            console.log("🟡 Nenhum registro novo encontrado para processar nesta rodada.");
        }

        res.json({ success: true, data: extractedThisRound });
    } catch (error) {
        console.error("Erro Auto VTME:", error);
        res.status(500).json({ error: 'Erro automático VTME' });
    } finally {
        isExtracting = false;
    }
});

app.get('/extract', async (req, res) => {
    try {
        const page = await getVTMEPage();
        
        // Pequeno delay para garantir que o Angular carregou o modal
        await page.waitForTimeout(1000);

        const data = await page.evaluate(() => {
            const getElementByXPath = (path) => {
                try {
                    return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                } catch (e) {
                    console.error("Erro ao avaliar XPath: " + path, e);
                    return null;
                }
            };

            const isValidPhoneNumber = (str) => {
                if (!str) return false;
                const clean = str.trim();
                if (clean.length < 8 || clean.length > 25) return false;
                const digitsOnly = clean.replace(/\D/g, '');
                if (digitsOnly.length < 8) return false;
                const blacklist = ['RUA', 'AVENIDA', 'BECO', 'TRAVESSA', 'Nº', 'CENTRO', 'BAIRRO', 'CEP', 'MANAUS', 'AM', 'BRASIL', 'ESQUINA', 'APARTAMENTO', 'APTO', 'BLOCO', 'CONDOMINIO', 'CUNHA MELO', 'BARCELOS'];
                const upper = clean.toUpperCase();
                for (const word of blacklist) {
                    if (upper.includes(word)) return false;
                }
                return true;
            };

            const data = {};
            console.log("🔍 Iniciando varredura DOM direcionada pelos XPaths fornecidos...");

            // 1. EXTRAÇÃO DIRECIONADA E OBRIGATÓRIA DA DATA DE NASCIMENTO FORNECIDA
            try {
                const xpathNascFibraCard5 = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-tim-fibra-modal/div[2]/pedido-tim-fibra-visualizar/div/div/div[5]/orb-card-v3/div/orb-card-row-v3[1]/div/div[2]/div/span";
                const xpathNascimentoFornecido = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-modal/div[2]/pedido-visualizar/div/div/div[7]/pedido-visualizar-pessoas/div/orb-card-v3[1]/div/div/div/div[2]/orb-card-row-v3[3]/div/div[2]/div/span";
                let nascEl = getElementByXPath(xpathNascFibraCard5) || getElementByXPath(xpathNascimentoFornecido);
                if (nascEl) {
                    data.data_nascimento = nascEl.innerText.trim();
                }
            } catch (e) {
                console.error("Erro ao coletar Data de Nascimento pelo XPath informado:", e);
            }

            // 1.1 EXTRAÇÃO DO NASCIMENTO DO RESPONSÁVEL EXCLUSIVO PARA SMB (PEDIDO-MODAL CARD 1 ROW 5 E CARD 3 ROW 4)
            try {
                const xpathSmbNasc1 = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-modal/div[2]/pedido-visualizar/div/div/div[7]/pedido-visualizar-pessoas/div/orb-card-v3[1]/div/div/div/div[2]/orb-card-row-v3[5]/div/div[2]/div/span";
                const xpathSmbNasc2 = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-modal/div[2]/pedido-visualizar/div/div/div[7]/pedido-visualizar-pessoas/div/orb-card-v3[1]/div/div/div/div[2]/orb-card-row-v3[5]/div/div[2]/div";
                const xpathSmbNasc3 = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-modal/div[2]/pedido-visualizar/div/div/div[7]/pedido-visualizar-pessoas/div/orb-card-v3[3]/div/div/div/div/orb-card-row-v3[4]/div/div[2]/div";
                
                let smbNascEl = getElementByXPath(xpathSmbNasc1) || 
                                 getElementByXPath(xpathSmbNasc2) || 
                                 getElementByXPath(xpathSmbNasc3);
                if (smbNascEl) {
                    data.smb_nasc_rep = smbNascEl.innerText.trim();
                }
            } catch (e) {
                console.error("Erro ao coletar Nascimento do Responsável para SMB:", e);
            }

            // 2. EXTRAÇÃO DIRECIONADA E OBRIGATÓRIA DO CPF FORNECIDO
            try {
                const xpathCpfFibra = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-tim-fibra-modal/div[2]/pedido-tim-fibra-visualizar/div/div/div[5]/cliente-card-v3/orb-card-v3/div/div/div/orb-card-row-v3[1]/div/div[2]/div/orb-copy-value-v3/span/span[1]";
                const xpathCpfFornecido = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-modal/div[2]/pedido-visualizar/div/div/div[7]/pedido-visualizar-pessoas/div/orb-card-v3[1]/div/div/div/div[1]/orb-card-row-v3[2]/div/div[2]/div/orb-copy-value-v3/span/span[1]";
                let cpfEl = getElementByXPath(xpathCpfFibra) || getElementByXPath(xpathCpfFornecido);
                if (cpfEl) {
                    data.cpf_cliente = cpfEl.innerText.trim();
                }
            } catch (e) {
                console.error("Erro ao coletar CPF pelo XPath informado:", e);
            }

            // 2.1 EXTRAÇÃO DIRECIONADA E OBRIGATÓRIA DO PLANO E VALOR
            try {
                const xpathPlano = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-tim-fibra-modal/div[2]/pedido-tim-fibra-visualizar/div/div/div[2]/orb-card-v3/div/orb-card-row-v3[2]/div/div[2]/div/span";
                let planoEl = getElementByXPath(xpathPlano);
                if (planoEl) {
                    let textoPlano = planoEl.innerText.trim();
                    data.plano = textoPlano;
                    
                    // Também tenta extrair o valor do plano se houver um padrão monetário no mesmo texto
                    const match = textoPlano.match(/(?:R\$\s*)?\d+[\.,]\d{2}/i);
                    if (match) {
                        let val = match[0].trim();
                        if (!val.toUpperCase().startsWith("R$")) {
                            val = "R$ " + val;
                        }
                        data.valor_plano = val.replace(/R\$\s*/i, 'R$ ');
                    }
                }
            } catch (e) {
                console.error("Erro ao coletar Plano pelo XPath informado:", e);
            }

            // 2.2 EXTRAÇÃO DIRECIONADA E OBRIGATÓRIA DO CONSULTOR E SUPERVISOR
            try {
                const xpathConsultor = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-tim-fibra-modal/div[2]/pedido-tim-fibra-visualizar/div/div/div[8]/orb-card-v3/div/orb-card-row-v3[1]/div/div[2]/div/span";
                let consultorEl = getElementByXPath(xpathConsultor);
                if (consultorEl) {
                    data.consultor = consultorEl.innerText.trim();
                }
            } catch (e) {
                console.error("Erro ao coletar Consultor pelo XPath informado:", e);
            }

            try {
                const xpathSupervisor = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-tim-fibra-modal/div[2]/pedido-tim-fibra-visualizar/div/div/div[8]/orb-card-v3/div/orb-card-row-v3[2]/div/div[2]/div/span";
                let supervisorEl = getElementByXPath(xpathSupervisor);
                if (supervisorEl) {
                    data.supervisor = supervisorEl.innerText.trim();
                }
            } catch (e) {
                console.error("Erro ao coletar Supervisor pelo XPath informado:", e);
            }

            // 3. EXTRAÇÃO DO CAMPO "NOME DA MÃE" VIA XPATHS DO CONTÊINER 5 E 9
            try {
                const xpathMaeSpanRow5 = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-tim-fibra-modal/div[2]/pedido-tim-fibra-visualizar/div/div/div[5]/orb-card-v3/div/orb-card-row-v3[5]/div/div[2]/div/span";
                const xpathMaeDivRow5 = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-tim-fibra-modal/div[2]/pedido-tim-fibra-visualizar/div/div/div[5]/orb-card-v3/div/orb-card-row-v3[5]/div/div[2]/div";
                const xpathMaeSpanRow2 = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-tim-fibra-modal/div[2]/pedido-tim-fibra-visualizar/div/div/div[5]/orb-card-v3/div/orb-card-row-v3[2]/div/div[2]/div/span";
                const xpathMaeDivRow2 = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-tim-fibra-modal/div[2]/pedido-tim-fibra-visualizar/div/div/div[5]/orb-card-v3/div/orb-card-row-v3[2]/div/div[2]/div";
                const xpathMaeSpanRow4 = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-tim-fibra-modal/div[2]/pedido-tim-fibra-visualizar/div/div/div[5]/orb-card-v3/div/orb-card-row-v3[4]/div/div[2]/div/span";
                const xpathMaeDivRow4 = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-tim-fibra-modal/div[2]/pedido-tim-fibra-visualizar/div/div/div[5]/orb-card-v3/div/orb-card-row-v3[4]/div/div[2]/div";
                const xpathMaeSpanRow9 = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-tim-fibra-modal/div[2]/pedido-tim-fibra-visualizar/div/div/div[9]/orb-card-v3/div/orb-card-row-v3/div/div[2]/div/span";
                const xpathMaeDivRow9 = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-tim-fibra-modal/div[2]/pedido-tim-fibra-visualizar/div/div/div[9]/orb-card-v3/div/orb-card-row-v3/div/div[2]/div";

                let maeEl = getElementByXPath(xpathMaeSpanRow5) || 
                            getElementByXPath(xpathMaeDivRow5) ||
                            getElementByXPath(xpathMaeSpanRow4) || 
                            getElementByXPath(xpathMaeDivRow4) ||
                            getElementByXPath(xpathMaeSpanRow2) || 
                            getElementByXPath(xpathMaeDivRow2) || 
                            getElementByXPath(xpathMaeSpanRow9) ||
                            getElementByXPath(xpathMaeDivRow9);
                            
                if (maeEl) {
                    let textoMae = maeEl.innerText.trim();
                    if (textoMae.toUpperCase().includes("NOME DA MÃE")) {
                        textoMae = textoMae.replace(/Nome da Mãe:/i, '').trim();
                    }
                    if (textoMae) data.nome_mae = textoMae;
                }
            } catch (e) {
                console.error("Erro ao extrair o Nome da Mãe pelo XPath dedicado:", e);
            }

            // 4. EXTRAÇÃO EXCLUSIVA E LIMPA DO E-MAIL DO CLIENTE
            try {
                const xpathEmailFornecido = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-tim-fibra-modal/div[2]/pedido-tim-fibra-visualizar/div/div/div[5]/cliente-card-v3/orb-card-v3/div/div/div/orb-card-row-v3[3]/div/div[2]/div/orb-copy-value-v3/span/span[1]";
                const xpathEmailLink = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-tim-fibra-modal/div[2]/pedido-tim-fibra-visualizar/div/div/div[5]/cliente-card-v3/orb-card-v3/div/div/div/orb-card-row-v3[4]/div/div[2]/div/a";
                const xpathEmailBackup = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-tim-fibra-modal/div[2]/pedido-tim-fibra-visualizar/div/div/div[5]/cliente-card-v3/orb-card-v3/div/div/div/orb-card-row-v3[3]/div/div[2]/div";
                
                let emailEl = getElementByXPath(xpathEmailFornecido) || getElementByXPath(xpathEmailLink);
                if (emailEl) {
                    data.email = emailEl.innerText.replace(/Email:/i, '').trim();
                } else {
                    let backupEl = getElementByXPath(xpathEmailBackup);
                    if (backupEl) {
                        const linkInterno = backupEl.querySelector('a');
                        let textoRaw = linkInterno ? linkInterno.innerText.trim() : backupEl.innerText.trim();
                        data.email = textoRaw.replace(/Email:/i, '').trim();
                    }
                }
            } catch (e) {
                console.error("Erro ao extrair o e-mail do titular:", e);
            }

            // 5. EXTRAÇÃO DE CONTATOS DO CARD 7 E CARD 8 (COM DETECÇÃO ROBUSTA VIA REGEX)
            try {
                const xpathPaiDivCard7 = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-tim-fibra-modal/div[2]/pedido-tim-fibra-visualizar/div/div/div[7]/orb-card-v3/div/orb-card-row-v3[1]/div/div[2]/div";
                const paiDivCard7 = getElementByXPath(xpathPaiDivCard7);
                if (paiDivCard7) {
                    const rawText = paiDivCard7.innerText || paiDivCard7.textContent || "";
                    const phones = rawText.match(/(?:\(?\d{2}\)?\s*)?\d{4,5}[-\s\.]?\d{4}/g) || [];
                    const validPhones = phones.map(p => p.trim()).filter(p => {
                        const digits = p.replace(/\D/g, '');
                        return digits.length >= 8 && digits.length <= 11;
                    });
                    if (validPhones[0]) data.contato1_card7 = validPhones[0];
                    if (validPhones[1]) data.contato2_card7 = validPhones[1];
                }
            } catch (e) {
                console.error("Erro ao extrair contatos do Card 7:", e);
            }

            // --- EXTRAÇÃO CARD 8 (PARCELAMENTO SMB) ---
            try {
                const xpathPaiDivCard8 = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-tim-fibra-modal/div[2]/pedido-tim-fibra-visualizar/div/div/div[8]/orb-card-v3/div/orb-card-row-v3[1]/div/div[2]/div";
                const paiDivCard8 = getElementByXPath(xpathPaiDivCard8);
                if (paiDivCard8) {
                    const rawText = paiDivCard8.innerText || paiDivCard8.textContent || "";
                    const phones = rawText.match(/(?:\(?\d{2}\)?\s*)?\d{4,5}[-\s\.]?\d{4}/g) || [];
                    const validPhones = phones.map(p => p.trim()).filter(p => {
                        const digits = p.replace(/\D/g, '');
                        return digits.length >= 8 && digits.length <= 11;
                    });
                    if (validPhones[0]) data.contato1_card8 = validPhones[0];
                    if (validPhones[1]) data.contato2_card8 = validPhones[1];
                }
            } catch (e) {
                console.error("Erro ao extrair contatos do Card 8:", e);
            }

            data.vtme_contato1 = data.contato1_card7 || data.contato1_card8 || '';
            data.vtme_contato2 = data.contato2_card7 || data.contato2_card8 || '';

            try {
                // Mapeamento do E-mail do Representante Legal
                const xpathCnpjEmailRep = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-tim-fibra-modal/div[2]/pedido-tim-fibra-visualizar/div/div/div[7]/orb-card-v3/div/orb-card-row-v3[2]/div/div[2]/div";
                const cnpjEmailRepEl = getElementByXPath(xpathCnpjEmailRep);
                if (cnpjEmailRepEl) {
                    const linkEmail = cnpjEmailRepEl.querySelector('a');
                    data.cnpj_email_rep = linkEmail ? linkEmail.innerText.replace(/Email:/i, '').trim() : cnpjEmailRepEl.innerText.replace(/Email:/i, '').trim();
                }

                // Mapeamento do Nome do Representante Legal
                const xpathCnpjNomeRep = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-tim-fibra-modal/div[2]/pedido-tim-fibra-visualizar/div/div/div[7]/orb-card-v3/div/orb-card-row-v3[3]/div/div[2]/div";
                const cnpjNomeRepEl = getElementByXPath(xpathCnpjNomeRep);
                if (cnpjNomeRepEl) {
                    const spanNome = cnpjNomeRepEl.querySelector('span.ng-binding');
                    data.cnpj_nome_rep = spanNome ? spanNome.innerText.trim() : cnpjNomeRepEl.innerText.trim();
                }

                // --- NOVOS XPATHS EXCLUSIVOS PARA REPRESENTANTE LEGAL EM CNPJ (CARD 6/8) ---
                const xpathCnpjNomeRepNovo = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-tim-fibra-modal/div[2]/pedido-tim-fibra-visualizar/div/div/div[6]/orb-card-v3/div/div/orb-card-row-v3[1]/div/div[2]/div/div/strong";
                let cnpjNomeRepElNovo = getElementByXPath(xpathCnpjNomeRepNovo);
                if (cnpjNomeRepElNovo) {
                    data.cnpj_nome_rep = cnpjNomeRepElNovo.innerText.trim();
                }

                const xpathCnpjMaeRep = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-tim-fibra-modal/div[2]/pedido-tim-fibra-visualizar/div/div/div[6]/orb-card-v3/div/div/orb-card-row-v3[8]/div/div[2]/div/span";
                let cnpjMaeRepEl = getElementByXPath(xpathCnpjMaeRep);
                if (cnpjMaeRepEl) {
                    let textoMaeRep = cnpjMaeRepEl.innerText.trim();
                    if (textoMaeRep.toUpperCase().includes("NOME DA MÃE")) {
                        textoMaeRep = textoMaeRep.replace(/Nome da Mãe:/i, '').trim();
                    }
                    if (textoMaeRep) data.cnpj_mae_rep = textoMaeRep;
                }

                // Nome da Mãe específico para SMB
                const xpathMaeSmb1 = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-tim-fibra-modal/div[2]/pedido-tim-fibra-visualizar/div/div/div[5]/orb-card-v3/div/orb-card-row-v3[5]/div/div[2]/div/span";
                const xpathMaeSmb2 = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-tim-fibra-modal/div[2]/pedido-tim-fibra-visualizar/div/div/div[9]/orb-card-v3/div/orb-card-row-v3/div/div[2]/div/span";
                let maeSmbEl = getElementByXPath(xpathMaeSmb1) || getElementByXPath(xpathMaeSmb2);
                if (maeSmbEl) {
                    let textoMaeSmb = maeSmbEl.innerText.trim();
                    if (textoMaeSmb.toUpperCase().includes("NOME DA MÃE")) {
                        textoMaeSmb = textoMaeSmb.replace(/Nome da Mãe:/i, '').trim();
                    }
                    data.nome_mae_smb = textoMaeSmb;
                }

                const xpathCnpjCpfRep = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-tim-fibra-modal/div[2]/pedido-tim-fibra-visualizar/div/div/div[6]/orb-card-v3/div/div/orb-card-row-v3[2]/div/div[2]/div/orb-copy-value-v3/span/span[1]";
                let cnpjCpfRepEl = getElementByXPath(xpathCnpjCpfRep);
                if (cnpjCpfRepEl) {
                    data.cnpj_cpf_rep = cnpjCpfRepEl.innerText.trim();
                }

                const xpathCnpjNascRep = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-tim-fibra-modal/div[2]/pedido-tim-fibra-visualizar/div/div/div[6]/orb-card-v3/div/div/orb-card-row-v3[4]/div/div[2]/div/span";
                let cnpjNascRepEl = getElementByXPath(xpathCnpjNascRep);
                if (cnpjNascRepEl) {
                    data.cnpj_nasc_rep = cnpjNascRepEl.innerText.trim();
                }

                const xpathCnpjEmailRep1 = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-tim-fibra-modal/div[2]/pedido-tim-fibra-visualizar/div/div/div[6]/orb-card-v3/div/div/orb-card-row-v3[7]/div/div[2]/div/orb-copy-value-v3/span/span[1]";
                const xpathCnpjEmailRep2 = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-tim-fibra-modal/div[2]/pedido-tim-fibra-visualizar/div/div/div[8]/orb-card-v3/div/orb-card-row-v3[2]/div/div[2]/div/orb-copy-value-v3/span/span[1]";
                let cnpjEmailRepElNovo = getElementByXPath(xpathCnpjEmailRep1) || getElementByXPath(xpathCnpjEmailRep2);
                if (cnpjEmailRepElNovo) {
                    data.cnpj_email_rep = cnpjEmailRepElNovo.innerText.replace(/Email:/i, '').trim();
                }
            } catch (e) {
                console.error("Erro na extração dos XPaths do bloco corporativo [6/7/8]:", e);
            }

            // 6. EXTRAÇÃO VIA XPATHS DO COMPONENTE DE PESSOAS GENERALISTA (MANTIDO PARA OUTROS FLUXOS/SMB)
            try {
                const xpathEmail = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-modal/div[2]/pedido-visualizar/div/div/div[7]/pedido-visualizar-pessoas/div/orb-card-v3[1]/div/div/div/div[2]/orb-card-row-v3[1]/div/div[2]/div";
                const emailEl = getElementByXPath(xpathEmail);
                if (emailEl) data.admin_email = emailEl.innerText.replace(/Email:/i, '').trim();

                const xpathTelefone = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-modal/div[2]/pedido-visualizar/div/div/div[7]/pedido-visualizar-pessoas/div/orb-card-v3[1]/div/div/div/div[2]/orb-card-row-v3[2]/div/div[2]/div";
                const telEl = getElementByXPath(xpathTelefone);
                if (telEl && (!data.vtme_contato1 || !data.vtme_contato2)) {
                    const strongsInternos = telEl.querySelectorAll('strong');
                    if (strongsInternos.length > 0) {
                        strongsInternos.forEach(si => {
                            if (si.innerText.includes('Contato 1') && si.nextElementSibling) {
                                const val = si.nextElementSibling.innerText.replace('·', '').trim();
                                if (isValidPhoneNumber(val) && !data.vtme_contato1) data.vtme_contato1 = val;
                            }
                            if (si.innerText.includes('Contato 2') && si.nextElementSibling) {
                                const val = si.nextElementSibling.innerText.replace('·', '').trim();
                                if (isValidPhoneNumber(val) && !data.vtme_contato2) data.vtme_contato2 = val;
                            }
                        });
                    } else {
                        const spans = telEl.querySelectorAll('span.ng-binding');
                        if (spans.length > 0) {
                            let telefonesList = Array.from(spans).map(s => s.innerText.replace('·', '').trim()).filter(txt => txt.length > 0 && isValidPhoneNumber(txt));
                            if (telefonesList[0] && !data.vtme_contato1) data.vtme_contato1 = telefonesList[0];
                            if (telefonesList[1] && !data.vtme_contato2) data.vtme_contato2 = telefonesList[1];
                        } else {
                            const val = telEl.innerText.trim();
                            if (isValidPhoneNumber(val) && !data.vtme_contato1) data.vtme_contato1 = val;
                        }
                    }
                }

                const xpathNome = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-modal/div[2]/pedido-visualizar/div/div/div[7]/pedido-visualizar-pessoas/div/orb-card-v3[1]/div/div/div/div[1]/orb-card-row-v3[1]/div/div[2]/div";
                const nomeEl = getElementByXPath(xpathNome);
                if (nomeEl) data.admin_nome = nomeEl.innerText.trim();

                // Backup do CPF do admin caso a rota principal falhe
                if (!data.cpf_cliente) {
                    const xpathCpfBackup = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-modal/div[2]/pedido-visualizar/div/div/div[7]/pedido-visualizar-pessoas/div/orb-card-v3[1]/div/div/div/div[1]/orb-card-row-v3[2]/div/div[2]/div/orb-copy-value-v3/span";
                    const cpfElBackup = getElementByXPath(xpathCpfBackup);
                    if (cpfElBackup) {
                        const bindingSpan = cpfElBackup.querySelector('span.ng-binding');
                        data.cpf_cliente = bindingSpan ? bindingSpan.innerText.trim() : cpfElBackup.innerText.trim();
                    }
                }
            } catch (e) {
                console.error("Erro na extração de dados alternativos do Representante:", e);
            }

            // 6.1 FALLBACK ROBUSTO: Busca Contato 1/2 por <strong> em qualquer lugar do modal visível
            try {
                if (!data.vtme_contato1 || !data.vtme_contato2) {
                    const modalEl = Array.from(document.querySelectorAll('pedido-tim-fibra-modal, pedido-modal, orb-modal-v3, .modal-content'))
                                         .find(el => el.offsetWidth > 0 && el.offsetHeight > 0) || document;
                    const allStrongs = Array.from(modalEl.querySelectorAll('strong'));
                    for (const si of allStrongs) {
                        const txt = si.innerText.trim();
                        if (txt.includes('Contato 1') && !data.vtme_contato1) {
                            const nextSpan = si.nextElementSibling;
                            if (nextSpan) {
                                const val = nextSpan.innerText.replace(/·/g, '').trim();
                                if (val && isValidPhoneNumber(val)) data.vtme_contato1 = val;
                            }
                        }
                        if (txt.includes('Contato 2') && !data.vtme_contato2) {
                            const nextSpan = si.nextElementSibling;
                            if (nextSpan) {
                                const val = nextSpan.innerText.replace(/·/g, '').trim();
                                if (val && isValidPhoneNumber(val)) data.vtme_contato2 = val;
                            }
                        }
                    }
                }
            } catch (e) {
                console.error("Erro no fallback de Contato 1/2:", e);
            }

            // 6.2 FALLBACK ROBUSTO: Busca Email, Nascimento e Mãe por <strong> no pedido-modal
            try {
                const modalEl = Array.from(document.querySelectorAll('pedido-tim-fibra-modal, pedido-modal, orb-modal-v3, .modal-content'))
                                     .find(el => el.offsetWidth > 0 && el.offsetHeight > 0) || document;
                const allStrongs = Array.from(modalEl.querySelectorAll('strong'));
                for (const si of allStrongs) {
                    const txt = si.innerText.trim().replace(':', '').trim().toUpperCase();

                    // Email
                    if (txt === 'E-MAIL' || txt === 'EMAIL') {
                        const nextSpan = si.nextElementSibling;
                        if (nextSpan) {
                            const val = nextSpan.innerText.trim();
                            if (val && val.includes('@')) data.email = val;
                        }
                    }

                    // Data de Nascimento
                    if (txt === 'DATA DE NASCIMENTO' || txt === 'NASCIMENTO' || txt === 'NASC' || txt === 'DATA DE NASC.') {
                        const nextSpan = si.nextElementSibling;
                        if (nextSpan) {
                            const val = nextSpan.innerText.trim();
                            if (val && /\d{2}\/\d{2}\/\d{4}/.test(val)) {
                                data.data_nascimento = val.match(/\d{2}\/\d{2}\/\d{4}/)[0];
                            }
                        }
                    }

                    // Nome da Mãe
                    if (txt === 'NOME DA MÃE' || txt === 'NOME DA MAE' || txt === 'MÃE' || txt === 'MAE') {
                        const nextSpan = si.nextElementSibling;
                        if (nextSpan) {
                            const val = nextSpan.innerText.trim();
                            // Só aceita se NÃO parecer endereço/CEP
                            if (val && val.length > 2 && !val.match(/CEP|^\d{5}/) && !val.match(/\/\s*[A-Z]{2}\s*$/)) {
                                data.nome_mae = val;
                            }
                        }
                    }
                }
            } catch (e) {
                console.error("Erro no fallback de Email/Nascimento/Mãe:", e);
            }

            // 6.3 FALLBACK ROBUSTO: Representante / Responsável em pedido-modal
            try {
                const pessoasContainer = document.querySelector('pedido-visualizar-pessoas');
                if (pessoasContainer) {
                    const firstCard = pessoasContainer.querySelector('orb-card-v3, .orb-card-v3');
                    if (firstCard) {
                        const rows = Array.from(firstCard.querySelectorAll('orb-card-row-v3, .orb-card-row-v3'));
                        rows.forEach(row => {
                            const text = (row.innerText || "").trim();
                            if (!text) return;
                            
                            const labelEl = row.querySelector('strong, label, b, .orb-card-label');
                            const labelText = labelEl ? labelEl.innerText.trim().toUpperCase() : "";
                            const valEl = row.querySelector('span.ng-binding, span, div.col-md-9, div:last-child');
                            let val = valEl ? valEl.innerText.trim() : "";
                            
                            if (!val) {
                                val = text.replace(labelText, '').replace(/^[:\s\-\·\•\s]+/, '').trim();
                            }
                            
                            const icon = row.getAttribute('orb-icon') || "";
                            
                            if (labelText.includes('NOME') || text.toUpperCase().startsWith('NOME:')) {
                                if (val && !data.cnpj_nome_rep) data.cnpj_nome_rep = val;
                            }
                            else if (labelText.includes('CPF') || text.toUpperCase().startsWith('CPF:') || icon === 'cpf') {
                                const cleanCPF = val.replace(/\D/g, '');
                                if (cleanCPF.length === 11 && !data.cnpj_cpf_rep) data.cnpj_cpf_rep = val;
                            }
                            else if (labelText.includes('EMAIL') || labelText.includes('E-MAIL') || text.toUpperCase().startsWith('EMAIL:') || icon === 'email' || val.includes('@')) {
                                if (val && !data.cnpj_email_rep) data.cnpj_email_rep = val;
                            }
                            else if (labelText.includes('NASCIMENTO') || labelText.includes('DATA DE') || text.toUpperCase().startsWith('DATA') || icon === 'calendario') {
                                if (val && !data.cnpj_nasc_rep) data.cnpj_nasc_rep = val;
                            }
                        });
                    }
                }
            } catch (e) {
                console.error("Erro no fallback de pedido-visualizar-pessoas:", e);
            }

            // EXTRAÇÃO EXCLUSIVA DO NOME FANTASIA (CARD 4)
            try {
                const xpathNomeFantasiaPedido = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-modal/div[2]/pedido-visualizar/div/div/div[4]/cliente-card-v3/orb-card-v3/div/div/div/orb-card-row-v3[1]/div/div[2]/div/span";
                const xpathNomeFantasiaFibra = "/html/body/div[1]/div/orb-modal-v3/div/div[2]/div/div/orb-dynamic-component/pedido-tim-fibra-modal/div[2]/pedido-tim-fibra-visualizar/div/div/div[4]/cliente-card-v3/orb-card-v3/div/div/div/orb-card-row-v3[1]/div/div[2]/div/span";
                
                let fantEl = getElementByXPath(xpathNomeFantasiaPedido) || getElementByXPath(xpathNomeFantasiaFibra);
                if (fantEl) {
                    let textoFantasia = fantEl.innerText.trim();
                    if (textoFantasia.toUpperCase().includes("NOME FANTASIA")) {
                        textoFantasia = textoFantasia.replace(/Nome Fantasia:/i, '').trim();
                    }
                    data.nome_fantasia = textoFantasia;
                }
            } catch (e) {
                console.error("Erro ao extrair o Nome Fantasia:", e);
            }

            // 7. EXTRAÇÃO AUXILIAR CASO OS CAMPOS SE VALIDEM EM DEMAIS ABAS
            try {
                const clienteCard = document.querySelector("cliente-card-v3");
                if (clienteCard) {
                    const nome = clienteCard.querySelector(".cv-title");
                    if (nome && !data.nome_cliente) data.nome_cliente = nome.innerText.trim();

                    if (!data.cnpj && !data.cpf_cliente) {
                        const cpf = clienteCard.querySelector('orb-card-row-v3[orb-icon="cpf"] span.ng-binding');
                        if (cpf) {
                            const valorDocumento = cpf.innerText.trim();
                            if (valorDocumento.replace(/\D/g, '').length > 11) data.cnpj = valorDocumento;
                            else data.cpf_cliente = valorDocumento;
                        }
                    }

                    if (!data.vtme_contato1) {
                        const telefone = clienteCard.querySelector('orb-card-row-v3[orb-icon="telefone"] span.ng-binding');
                        if (telefone) {
                            const val = telefone.innerText.trim();
                            if (isValidPhoneNumber(val)) data.vtme_contato1 = val;
                        }
                    }

                    const endereco = clienteCard.querySelector('orb-card-row-v3[orb-icon="endereco"] .ng-binding');
                    if (endereco) data.endereco = endereco.innerText.trim();
                }
            } catch(e) {}

            // 8. CAPTURA DO DOCUMENTO NO TOPO DO VTME (CASO NENHUM SEJA ENCONTRADO)
            if (!data.cnpj && !data.cpf_cliente) {
                try {
                    const cnpjModalTarget = document.querySelector('pedido-tim-fibra-visualizar cliente-card-v3 orb-card-row-v3 orb-copy-value-v3 span span.ng-binding');
                    if (cnpjModalTarget) {
                        const docTexto = cnpjModalTarget.innerText.trim();
                        const apenasNumeros = docTexto.replace(/\D/g, '');
                        if (apenasNumeros.length > 11) data.cnpj = docTexto;
                        else if (apenasNumeros.length === 11) data.cpf_cliente = docTexto;
                    }
                } catch (e) {}
            }

            // 9. VARREDURA COMPLEMENTAR DE LABELS EM TODA A TELA (FALLBACK SEGURO)
            try {
                const containers = document.querySelectorAll('div[ng-transclude], div.ng-scope, table, md-card, div, tr, td');
                containers.forEach(container => {
                    const strongs = container.querySelectorAll('strong, b, label');
                    strongs.forEach(strong => {
                        const labelText = strong.innerText.replace(':', '').trim().toUpperCase();
                        let nextEl = strong.nextElementSibling;
                        let value = "";
                        if (nextEl && (nextEl.tagName === 'SPAN' || nextEl.classList.contains('ng-binding'))) {
                            value = nextEl.innerText.trim();
                        } else if (strong.nextSibling) {
                            value = strong.nextSibling.textContent.trim();
                        }
                        value = value.replace(/^[:\s\-\·\•\s]+/, '').trim();
                        if (!value) return;

                        if ((labelText === 'CLIENTE' || labelText === 'RAZÃO SOCIAL' || labelText === 'NOME/RAZÃO SOCIAL' || labelText === 'NOME' || labelText === 'EMPRESA') && !data.nome_cliente) data.nome_cliente = value;
                        if (!data.cnpj && !data.cpf_cliente) {
                            if (labelText === 'CPF' || labelText === 'CPF/CNPJ' || labelText === 'CNPJ') {
                                const limpo = value.replace(/\D/g, '');
                                if (limpo.length > 11) data.cnpj = value;
                                else if (limpo.length === 11) data.cpf_cliente = value;
                            }
                        }
                        if (labelText === 'NOME FANTASIA') data.nome_fantasia = value;
                        if ((labelText === 'MAE' || labelText === 'MÃE' || labelText === 'MAÃE') && !data.nome_mae) data.nome_mae = value;
                        if ((labelText === 'DATA DE NASCIMENTO' || labelText === 'NASCIMENTO' || labelText === 'NASC' || labelText === 'DATA DE NASC.') && !data.data_nascimento) data.data_nascimento = value;
                        if (labelText === 'PLANO' || labelText === 'PLANO CONTRATADO') data.plano = value;
                        if ((labelText === 'VALOR' || labelText === 'VALOR DO PLANO' || labelText === 'MENSALIDADE' || labelText === 'VALOR PLANO') && !data.valor_plano) {
                            const match = value.match(/(?:R\$\s*)?\d+[\.,]\d{2}/i);
                            if (match) {
                                let val = match[0].trim();
                                if (!val.toUpperCase().startsWith("R$")) {
                                    val = "R$ " + val;
                                }
                                data.valor_plano = val.replace(/R\$\s*/i, 'R$ ');
                            } else {
                                data.valor_plano = value;
                            }
                        }
                        if (labelText === 'VENCIMENTO' || labelText === 'DATA DE VENCIMENTO') data.data_vencimento = value;
                        if (labelText === 'PROTOCOLO') data.protocolo = value;
                        if (labelText === 'EMAIL' || labelText === 'E-MAIL') {
                            if (!data.email) data.email = value.replace(/Email:/i, '').trim();
                        }
                        if ((labelText === 'CONSULTOR' || labelText === 'CONSULTOR(A)' || labelText === 'VENDEDOR') && !data.consultor) data.consultor = value;
                        if ((labelText === 'SUPERVISOR' || labelText === 'SUPERVISOR(A)' || labelText === 'LIDER') && !data.supervisor) data.supervisor = value;
                    });
                });
            } catch(e) {}

            const divs = document.querySelectorAll('.ng-binding');
            divs.forEach(div => {
                const label = div.querySelector('label') || div.querySelector('b');
                if (!label) return;
                const labelText = label.innerText.replace(':', '').trim();
                const value = div.innerText.replace(label.innerText, '').replace(/^[:\s-]+/, '').trim();

                if ((labelText === 'Endereço' || labelText === 'Logradouro') && value && !data.endereco) {
                    const parts = value.split(/Ponto de referência:/i);
                    const enderecoGeral = parts[0].trim();
                    data.endereco = enderecoGeral;
                    const cityUfMatch = enderecoGeral.match(/([^,]+)\s*\/\s*([A-Z]{2})/);
                    if (cityUfMatch) data.uf = cityUfMatch[2].trim();
                }
            });

            // Busca o modal ativo para restringir a busca de texto apenas aos dados do contrato atual (evita pegar dados de outros clientes do grid em segundo plano)
            const modalEl = Array.from(document.querySelectorAll('pedido-tim-fibra-modal, pedido-modal, orb-modal-v3, .modal-content'))
                                 .find(el => el.offsetWidth > 0 && el.offsetHeight > 0) || document.body;
            const modalText = modalEl.innerText;

            if (!data.cnpj) {
                const cnpjMatch = modalText.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2}/) || modalText.match(/\b\d{14}\b/);
                if (cnpjMatch) data.cnpj = cnpjMatch[0];
            }

            if (!data.uf) {
                const ufMatch = modalText.match(/[\/\-]\s*([A-Z]{2})\s*$/m) || modalText.match(/[\/\-]\s*([A-Z]{2})\b/);
                if (ufMatch) data.uf = ufMatch[1].toUpperCase().trim();
            }

            // --- POS-PROCESSAMENTO E VALIDACAO CPF VS CNPJ ---
            // Se cpf_cliente vier com mais de 11 dígitos, é na verdade um CNPJ
            if (data.cpf_cliente) {
                const cleanDoc = data.cpf_cliente.replace(/\D/g, '');
                if (cleanDoc.length > 11) {
                    data.cnpj = data.cpf_cliente;
                    data.cpf_cliente = "";
                }
            }

            if (!data.cpf_cliente && !data.cnpj && data.nome_cliente) {
                const numerosNoNome = data.nome_cliente.replace(/\D/g, '');
                if (numerosNoNome.length >= 6) {
                    if (numerosNoNome.length > 11 || data.nome_cliente.toUpperCase().includes('LTDA') || data.nome_cliente.toUpperCase().includes('SA')) {
                        data.cnpj = numerosNoNome;
                    } else {
                        data.cpf_cliente = numerosNoNome;
                    }
                }
            }

            const formatCPFCNPJ = (documento) => {
                if (!documento) return '';
                const cleanDoc = String(documento).replace(/\D/g, '');
                if (cleanDoc.length === 11) {
                    return cleanDoc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                } else if (cleanDoc.length === 14) {
                    return cleanDoc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
                } else if (cleanDoc.length >= 6 && cleanDoc.length < 14) {
                    return cleanDoc;
                }
                return documento;
            };

            const limparDataNascimento = (str) => {
                if (!str) return '';
                const match = str.match(/\d{2}\/\d{2}\/\d{4}/);
                if (match) return match[0];
                return str.replace(/Data de Nascimento:/i, '').replace(/Nascimento:/i, '').trim();
            };

            const limparNomeMae = (str) => {
                if (!str) return '';
                return str
                    .replace(/Nome da Mãe:/i, '')
                    .replace(/Nome da Mae:/i, '')
                    .replace(/Mãe:/i, '')
                    .replace(/Mae:/i, '')
                    .replace(/Maãe:/i, '')
                    .replace(/^[:\s-]+/, '')
                    .trim();
            };

            if (data.cpf_cliente) data.cpf_cliente = formatCPFCNPJ(data.cpf_cliente);
            if (data.cnpj) data.cnpj = formatCPFCNPJ(data.cnpj);
            if (data.cnpj_cpf_rep) data.cnpj_cpf_rep = formatCPFCNPJ(data.cnpj_cpf_rep);

            if (data.data_nascimento) data.data_nascimento = limparDataNascimento(data.data_nascimento);
            if (data.cnpj_nasc_rep) data.cnpj_nasc_rep = limparDataNascimento(data.cnpj_nasc_rep);
            if (data.smb_nasc_rep) data.smb_nasc_rep = limparDataNascimento(data.smb_nasc_rep);

            if (data.nome_mae) data.nome_mae = limparNomeMae(data.nome_mae);
            if (data.cnpj_mae_rep) data.cnpj_mae_rep = limparNomeMae(data.cnpj_mae_rep);
            if (data.nome_mae_smb) data.nome_mae_smb = limparNomeMae(data.nome_mae_smb);

            const finalUF = (() => {
                if (data.uf) return data.uf;
                const addr = data.endereco || "";
                const matches = addr.match(/\/\s*([A-Z]{2})/);
                if (matches) return matches[1];
                const stateMatch = addr.match(/,\s*([A-Za-z\s]+)\/([A-Z]{2})/);
                if (stateMatch) return stateMatch[2].trim();
                const phone = data.vtme_contato1 || "";
                const dddMatch = phone.match(/\((\d{2})\)/) || phone.replace(/\D/g, '').match(/^(\d{2})/);
                if (dddMatch) {
                    const ddd = dddMatch[1];
                    const dddMap = {
                        '11': 'SP', '12': 'SP', '13': 'SP', '14': 'SP', '15': 'SP', '16': 'SP', '17': 'SP', '18': 'SP', '19': 'SP',
                        '21': 'RJ', '22': 'RJ', '24': 'RJ', '27': 'ES', '28': 'ES',
                        '31': 'MG', '32': 'MG', '33': 'MG', '34': 'MG', '35': 'MG', '37': 'MG', '38': 'MG',
                        '41': 'PR', '42': 'PR', '43': 'PR', '44': 'PR', '45': 'PR', '46': 'PR',
                        '47': 'SC', '48': 'SC', '49': 'SC',
                        '51': 'RS', '53': 'RS', '54': 'RS', '55': 'RS',
                        '61': 'DF', '62': 'GO', '64': 'GO', '63': 'TO',
                        '65': 'MT', '66': 'MT', '67': 'MS', '68': 'AC', '69': 'RO',
                        '71': 'BA', '73': 'BA', '74': 'BA', '75': 'BA', '77': 'BA', '79': 'SE',
                        '81': 'PE', '87': 'PE', '82': 'AL', '83': 'PB', '84': 'RN', '85': 'CE', '88': 'CE',
                        '86': 'PI', '89': 'PI',
                        '91': 'PA', '92': 'AM', '93': 'PA', '94': 'PA', '95': 'RR', '96': 'AP', '97': 'AM', '98': 'MA', '99': 'MA'
                    };
                    return dddMap[ddd] || "";
                }
                return "";
            })();

            // Regra de validação CPF vs CNPJ
            let finalCPF = "";
            let finalCNPJ = "";
            const hasCnpj = data.cnpj && data.cnpj.replace(/\D/g, '').length > 0;
            if (hasCnpj) {
                finalCNPJ = data.cnpj;
                const cpfCandidate = data.cnpj_cpf_rep || data.cpf_cliente || "";
                finalCPF = cpfCandidate.replace(/\D/g, '').length > 11 ? "" : cpfCandidate;
            } else {
                finalCPF = data.cpf_cliente || "";
                finalCNPJ = "este cliente é pessoa fisica (PF)";
            }

            return {
                nome_cliente: data.nome_cliente || data.admin_nome || "Desconhecido",
                cpf_cliente: finalCPF,
                cnpj_cliente: finalCNPJ,
                mae: data.nome_mae || data.cnpj_mae_rep || data.nome_mae_smb || "",
                nascimento: data.data_nascimento || data.smb_nasc_rep || data.cnpj_nasc_rep || "",
                endereco: data.endereco || "",
                email: data.email || data.cnpj_email_rep || data.admin_email || "",
                tel: data.vtme_contato2 ? `${data.vtme_contato1} / ${data.vtme_contato2}` : (data.vtme_contato1 || ""),
                plano: data.plano || "",
                valor_plano: data.valor_plano || "",
                vencimento: data.data_vencimento || "",
                uf: finalUF,
                consultora: data.consultor || "",
                supervisor: data.supervisor || "",
                protocolo: data.protocolo || "",
                nome_fantasia: data.nome_fantasia || "",
                cnpj_nome_rep: data.cnpj_nome_rep || data.admin_nome || "",
                cnpj_cpf_rep: data.cnpj_cpf_rep || (finalCNPJ !== "este cliente é pessoa fisica (PF)" ? finalCPF : "") || "",
                cnpj_email_rep: data.cnpj_email_rep || data.admin_email || "",
                cnpj_nasc_rep: data.cnpj_nasc_rep || data.smb_nasc_rep || "",
                bio: data.bio || "--"
            };
        });

        if (data.tel && data.tel.includes('/')) {
            const parts = data.tel.split('/');
            data.tel1 = parts[0].trim();
            data.tel2 = parts[1].trim();
        } else {
            data.tel1 = data.tel;
            data.tel2 = "";
        }

        // ─── BUSCA VENCIMENTO NO PARCELAMENTO.xlsx ─────────────────────────
        // Para as máscaras "Parcelamento SMB" e "Parcelamento Fibra",
        // busca na PARCELAMENTO.xlsx todas as faturas do CPF/CNPJ
        const docParaBusca = (data.cnpj_cliente && !data.cnpj_cliente.includes('pessoa fisica'))
            ? data.cnpj_cliente
            : data.cpf_cliente;
        data.vencimento_fatura = buscarVencimentoNoParcelamento(docParaBusca || '');
        console.log(`📊 Vencimento PARCELAMENTO [${docParaBusca}]:`, data.vencimento_fatura || '(não encontrado)');

        res.json(data);
    } catch (error) {
        if (error.message === 'VTME_NOT_OPEN') {
            return res.status(404).json({ error: 'Abra o VTME pelo menu lateral primeiro.' });
        }
        console.error(error);
        res.status(500).json({ error: 'Falha ao extrair dados' });
    }
});

const PORT = 3001;
app.listen(PORT, async () => {
    console.log(`🚀 Ponte de Automação rodando em http://localhost:${PORT}`);
    console.log(`Pronto para operações!`);
    try {
        const ctx = await initBrowser();
        
        // 1. Limpeza suave de abas antigas (opcional para evitar crash)
        try {
            const pages = ctx.pages();
            for (const p of pages) {
                const url = p.url().toLowerCase();
                // Só fecha se for explicitamente uma das ferramentas e não for a interface
                if ((url.includes('orbitsistemas') || url.includes('timbrasil') || url.includes('whatsapp') || url.includes('3c.plus')) && !url.includes('5173')) {
                    await p.close().catch(() => {});
                    await new Promise(r => setTimeout(r, 300)); // Pequena pausa entre fechamentos
                }
            }
        } catch (err) { console.log("Aviso: Falha na limpeza de abas antigas."); }

        // 2. Garante a Interface do Sistema
        const currentPages = ctx.pages();
        let appPage = currentPages.find(p => p.url().includes('localhost:5173'));
        
        if (!appPage) {
            appPage = await ctx.newPage();
            console.log("🚀 Abrindo Interface do Sistema...");
            await appPage.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {
                console.log("⚠️ Verifique se o Vite (npm run dev) está ativo.");
            });
        } else {
            await appPage.bringToFront().catch(() => {});
        }

    } catch (e) {
        console.error("❌ Erro crítico no arranque:", e.message);
    }
});
