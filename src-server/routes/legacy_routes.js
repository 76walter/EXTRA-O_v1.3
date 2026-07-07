
import express from 'express';
import fs from 'fs';
import path from 'path';
import { initHeadlessBrowser, initHeadedBrowser, isBrowserActive, autoLogin, getHeadlessContext, getHeadedContext, isExtracting, isExtractingTim, setExtracting, setExtractingTim, closeBrowsers } from '../browser/manager.js';
import { loadMasks, saveMasks, loadSettings, saveSettings } from '../utils/storage.js';
import { ENV } from '../config/env.js';
import { timRPA } from '../rpa/tim.js';
import { vtmeRPA } from '../rpa/vtme.js';

export const routes = express.Router();
const app = routes; // Alias para compatibilidade com o código legado

// --- ROTAS LEGADAS ---













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

app.get('/settings', (req, res) => {
    res.json(loadSettings());
});

app.post('/settings', (req, res) => {
    saveSettings(req.body);
    res.json({ success: true });
});

// ===== HEALTH CHECK =====
app.get('/health', async (req, res) => {
    const browserOk = await isBrowserActive();
    let pagesList = [];
    const hlCtx = getHeadlessContext();
    if (hlCtx) {
        try {
            pagesList = pagesList.concat(hlCtx.pages().map(p => {
                try { return { url: p.url() }; } catch { return { url: 'unknown' }; }
            }));
        } catch {}
    }
    const hCtx = getHeadedContext();
    if (hCtx) {
        try {
            pagesList = pagesList.concat(hCtx.pages().map(p => {
                try { return { url: p.url() }; } catch { return { url: 'unknown' }; }
            }));
        } catch {}
    }
    res.json({
        status: 'ok',
        browser: browserOk,
        uptime: Math.floor(process.uptime()),
        memory: {
            rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
            heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
        },
        pages: pagesList,
        extracting: { vtme: isExtracting, tim: isExtractingTim }
    });
});

// ===== RETRY WRAPPER (melhorado com backoff) =====
async function withRetry(fn, maxRetries = 3, label = 'operação') {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            console.error(`❌ ${label} falhou (tentativa ${attempt}/${maxRetries}):`, error.message);
            if (attempt === maxRetries) throw error;
            if (error.message.includes('browser has been closed') || error.message.includes('Target page')) {
                console.log('🔄 Navegador perdido. Reiniciando...');
                await initHeadedBrowser();
            }
            await new Promise(r => setTimeout(r, 2000 * attempt));
        }
    }
}

// ===== FILA DE OPERAÇÕES (Mutex) — Serializa acessos ao browser =====
const operationQueue = [];
let isProcessingQueue = false;

async function enqueueOperation(label, fn) {
    return new Promise((resolve, reject) => {
        operationQueue.push({ label, fn, resolve, reject });
        processQueue();
    });
}

async function processQueue() {
    if (isProcessingQueue) return;
    isProcessingQueue = true;
    while (operationQueue.length > 0) {
        const { label, fn, resolve, reject } = operationQueue.shift();
        try {
            const result = await fn();
            resolve(result);
        } catch (error) {
            console.error(`❌ Operação "${label}" falhou:`, error.message);
            reject(error);
        }
    }
    isProcessingQueue = false;
}

// Localização rápida de linha vazia (otimizado)
async function findFirstEmptyRow(sheetPage) {
    console.log("🔍 Localizando primeira linha vazia...");
    
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
    if (!isA2Filled) {
        console.log('✅ A2 está vazia, iniciando inserção a partir da linha 2.');
        return true;
    }
    
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
    
    // 6. Verificação final
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
                return true;
            }
        }
        console.log('⚠️ Não encontrou linha vazia em 200 passos.');
        return false;
    }
    
    console.log('✅ Primeira linha vazia encontrada.');
    return true;
}


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
        
        const headedCtx = await initHeadedBrowser();
        let sheetPage = headedCtx.pages().find(p => p.url().includes('onedrive.live.com') || p.url().includes('1drv.ms'));
        
        if (!sheetPage) {
            sheetPage = await headedCtx.newPage();
            await sheetPage.goto(spreadsheetUrl, { waitUntil: 'load', timeout: 60000 });
            try {
                await sheetPage.waitForSelector('[role="grid"]', { timeout: 15000 });
            } catch (e) {
                console.log('⚠️ Planilha demorou a renderizar, aguardando mais 5s...');
                await sheetPage.waitForTimeout(5000);
            }
        } else {
            await sheetPage.bringToFront();
        }

        // Lógica para encontrar linha vazia
        await findFirstEmptyRow(sheetPage);

        
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
            await sheetPage.waitForTimeout(100); // Reduzido de 200ms
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



app.get('/open-vtme', async (req, res) => {
    try {
        const ctx = await initHeadedBrowser();
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

        // Auto-login em segundo plano se estiver na tela de login
        const isLoginPage = vtmePage.url().includes('/login');
        const hasLoginForm = await vtmePage.evaluate(() => {
            const pwd = document.querySelector('input[type="password"]');
            if (!pwd) return false;
            const style = window.getComputedStyle(pwd);
            return style.display !== 'none' && style.visibility !== 'hidden' && pwd.offsetWidth > 0;
        });

        if (isLoginPage || hasLoginForm) {
            console.log("🔐 VTME na tela de login. Efetuando auto-login...");
            const settings = loadSettings();
            if (settings.vtmeUser && settings.vtmePass) {
                await autoLogin(vtmePage, settings.vtmeUser, settings.vtmePass);
                console.log("✅ Auto-login VTME realizado.");
            } else {
                console.log("⚠️ Credenciais VTME não configuradas. Configure em Configurações.");
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error("Erro ao abrir VTME:", error);
        res.status(500).json({ error: 'Erro ao abrir VTME' });
    }
});

app.get('/open-tim', async (req, res) => {
    if (req.user && req.user.perfil === 'CHURN') {
        return res.status(403).json({ error: 'Acesso ao App TIM Vendas não permitido para o perfil CHURN.' });
    }
    try {
        const ctx = await initHeadedBrowser();
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

app.post('/login-tim', async (req, res) => {
    if (req.user && req.user.perfil === 'CHURN') {
        return res.status(403).json({ error: 'Login TIM não permitido para o perfil CHURN.' });
    }
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ error: 'Token não fornecido' });

        const settings = loadSettings();
        if (!settings.timUser) return res.status(400).json({ error: 'Usuário TIM (Matrícula) não configurado.' });

        const ctx = await initHeadedBrowser();
        const pages = ctx.pages();
        let timPage = pages.find(p => p.url().includes('apptimvendas.timbrasil.com.br'));
        
        if (!timPage) {
            timPage = await ctx.newPage();
            await timPage.goto('https://apptimvendas.timbrasil.com.br/#/login', { waitUntil: 'load', timeout: 60000 });
        } else {
            await timPage.bringToFront();
        }

        console.log(`🔐 Injetando Token TIM Vendas (Usuário: ${settings.timUser})...`);

        // Aguarda os inputs aparecerem na tela (ignorando se falhar para tentar de qualquer forma)
        await timPage.waitForSelector('input', { timeout: 10000 }).catch(()=>null);

        let success = false;
        try {
            // 1. Encontrar o input da matrícula (primeiro input de texto visível)
            const textLocators = await timPage.locator('input[type="text"], input:not([type]), input[type="email"], input[name*="user"], input[name*="login"]').all();
            let matLocator = null;
            for (const loc of textLocators) {
                if (await loc.isVisible()) {
                    matLocator = loc;
                    break;
                }
            }

            // 2. Encontrar o input do token/senha (input de password ou o segundo texto visível)
            const passLocators = await timPage.locator('input[type="password"]').all();
            let tokenLocator = null;
            for (const loc of passLocators) {
                if (await loc.isVisible()) {
                    tokenLocator = loc;
                    break;
                }
            }

            if (!tokenLocator) {
                let count = 0;
                for (const loc of textLocators) {
                    if (await loc.isVisible()) {
                        count++;
                        if (count === 2) {
                            tokenLocator = loc;
                            break;
                        }
                    }
                }
            }

            if (matLocator && tokenLocator) {
                // 3. Digitar usando as funções NATIVAS do Playwright (simula teclado humano real)
                await matLocator.click();
                await matLocator.fill(''); // Limpa
                await timPage.waitForTimeout(200);
                await matLocator.pressSequentially(settings.timUser, { delay: 50 }); // Digitação humana
                
                await tokenLocator.click();
                await tokenLocator.fill('');
                await timPage.waitForTimeout(200);
                await tokenLocator.pressSequentially(token, { delay: 50 });
                
                await timPage.waitForTimeout(300);

                // 4. Clicar no botão de Login
                const btnLocators = await timPage.locator('button, a.btn, input[type="button"], input[type="submit"]').all();
                let loginBtnLocator = null;
                for (const loc of btnLocators) {
                    if (await loc.isVisible()) {
                        const text = (await loc.innerText()).toLowerCase();
                        const value = (await loc.getAttribute('value') || "").toLowerCase();
                        if (text.includes('login') || text.includes('entrar') || text.includes('acessar') || value.includes('login') || value.includes('entrar')) {
                            loginBtnLocator = loc;
                            break;
                        }
                    }
                }

                if (loginBtnLocator) {
                    await loginBtnLocator.click();
                } else {
                    await tokenLocator.press('Enter');
                }
                success = true;
            }
        } catch (err) {
            console.error("Erro interno ao usar locators Playwright:", err);
        }

        if (success) {
            console.log("✅ Token injetado com sucesso.");
            res.json({ success: true });
        } else {
            res.status(400).json({ error: 'Campos de login não encontrados na tela' });
        }

    } catch (error) {
        console.error("Erro ao injetar login TIM:", error);
        res.status(500).json({ error: 'Erro interno ao realizar login' });
    }
});

app.get('/extract-tim', async (req, res) => {
    if (req.user && req.user.perfil === 'CHURN') {
        return res.status(403).json({ error: 'A extração do TIM não é permitida para o perfil CHURN.' });
    }
    try {
        // Recebe lista de ordens já processadas do frontend para evitar reprocessamento
        let processedOrders = [];
        if (req.query.processed) {
            try { processedOrders = JSON.parse(req.query.processed); } catch {}
        }

        console.log("🚀 [Paralelismo] Iniciando extração TIM Vendas e consulta VTME em paralelo...");

        // Executa ambos os robôs em paralelo
        const timPromise = timRPA.extractAuto(processedOrders);
        const vtmePromise = vtmeRPA.extractAuto().catch(err => {
            console.error("⚠️ [Paralelismo] Erro na extração paralela do VTME:", err.message);
            return { success: false, data: [] };
        });

        const [timResult, vtmeResult] = await Promise.all([timPromise, vtmePromise]);

        // Se a extração do TIM foi bem-sucedida, faz o cruzamento de dados para injetar a Biometria, Consultor e Supervisor do VTME
        if (timResult.success && Array.isArray(timResult.data)) {
            const vtmeData = (vtmeResult && Array.isArray(vtmeResult.data)) ? vtmeResult.data : [];
            console.log(`📊 [Paralelismo] TIM retornou ${timResult.data.length} registros. VTME retornou ${vtmeData.length} registros para cruzamento.`);

            timResult.data = timResult.data.map(timItem => {
                const cleanTimCPF = timItem.cpf && timItem.cpf !== '--' ? timItem.cpf.replace(/\D/g, '') : '';
                
                // Busca registro correspondente no VTME por CPF ou Nome do Cliente
                const vtmeMatch = vtmeData.find(vtmeItem => {
                    const cleanVtmeCPF = vtmeItem.cpf && vtmeItem.cpf !== '--' ? vtmeItem.cpf.replace(/\D/g, '') : '';
                    if (cleanTimCPF && cleanVtmeCPF && cleanTimCPF === cleanVtmeCPF) {
                        return true;
                    }
                    if (timItem.nome && vtmeItem.cliente && timItem.nome.trim().toLowerCase() === vtmeItem.cliente.trim().toLowerCase()) {
                        return true;
                    }
                    return false;
                });

                if (vtmeMatch) {
                    console.log(`🎯 [Paralelismo] Correspondência encontrada para ${timItem.nome}. Injetando Biometria: ${vtmeMatch.bio}`);
                    return {
                        ...timItem,
                        bio: vtmeMatch.bio || timItem.bio || '--',
                        consultor: vtmeMatch.consultor || timItem.consultor || '--',
                        supervisor: vtmeMatch.supervisor || timItem.supervisor || '--'
                    };
                }
                return timItem;
            });
        }

        res.json(timResult);
    } catch (e) {
        console.error("❌ Erro na rota /extract-tim:", e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/macro-tim', async (req, res) => {
    if (req.user && req.user.perfil === 'CHURN') {
        return res.status(403).json({ error: 'Preenchimento de Macro não permitido para o perfil CHURN.' });
    }
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

        const ctx = await initHeadedBrowser();
        const pages = ctx.pages();
        
        // Link da Planilha 'MACRO APP 2026' atualizado
        let sheetUrl = "https://excel.cloud.microsoft/open/onedrive/?docId=D7954F0A2A4EFE88%21s2528d66f763f4b8da594141c18e1da1c&driveId=D7954F0A2A4EFE88"; 
        
        // Identificação via ID único da planilha para não confundir com outras
        let sheetPage = pages.find(p => p.url().includes('s2528d66f763f4b8da594141c18e1da1c'));
        
        if (!sheetPage) {
            sheetPage = await ctx.newPage();
            console.log("🚀 Abrindo Planilha Macro...");
            await sheetPage.goto(sheetUrl, { waitUntil: 'load', timeout: 60000 });
            try {
                await sheetPage.waitForSelector('[role="grid"]', { timeout: 15000 });
            } catch (e) {
                console.log('⚠️ Planilha demorou a renderizar, aguardando mais 5s...');
                await sheetPage.waitForTimeout(5000);
            }
        } else {
            console.log("📂 Planilha Macro já aberta, trazendo para frente...");
            await sheetPage.bringToFront();
        }

        console.log(`Preenchendo a Planilha Macro com ${items.length} novo(s) pedido(s)...`);
        
        await findFirstEmptyRow(sheetPage);

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
                await sheetPage.waitForTimeout(100); // Reduzido de 200ms
            }
            
            // Dá o comando do enter para Excel pular de linha e reseta o cursor pra Coluna A da linha nova
            await sheetPage.keyboard.press('Enter');
            await sheetPage.waitForTimeout(200); // Reduzido de 400ms
            await sheetPage.keyboard.press('Home'); // Medida de segurança pra forçar voltar na Coluna A
            await sheetPage.waitForTimeout(200); // Reduzido de 400ms
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

async function getVTMEPage(retries = 0) {
    const MAX_RETRIES = 3;
    try {
        const ctx = await initHeadedBrowser();
        let pages = ctx.pages();
        let vtmePage = pages.find(p => p.url().includes('orbitsistemas.com.br'));
        
        if (!vtmePage) {
            console.log("🚀 Auto-abertura do VTME...");
            vtmePage = await ctx.newPage();
            await vtmePage.goto('https://vtme2.orbitsistemas.com.br/agstelecom_v2/index.html#/pedido/gerenciarPedido', { waitUntil: 'load', timeout: 60000 });
        }
        
        return vtmePage;
    } catch (error) {
        if (retries >= MAX_RETRIES) {
            console.error(`❌ getVTMEPage falhou após ${MAX_RETRIES} tentativas:`, error.message);
            throw new Error('VTME_NOT_OPEN');
        }
        console.log(`⚠️ Erro ao recuperar navegador (tentativa ${retries + 1}/${MAX_RETRIES}), reiniciando...`);
        await new Promise(r => setTimeout(r, 2000 * (retries + 1)));
        return getVTMEPage(retries + 1);
    }
}

app.get('/fetch-onedrive-contacts', async (req, res) => {
    const spreadsheetUrl = "https://onedrive.live.com/:x:/g/personal/0dd5456ada276c57/IQBzolG7QpUPRLm_isfxRMQeAR1yOhcJsbUPpXkh1dMmirw?rtime=60gg6ayX3kg&nav=MTVfezYxQUUzRjk2LUQwN0YtNDdEOC04MTA5LTU5RDY4NkZGOUIyOH0&redeem=aHR0cHM6Ly8xZHJ2Lm1zL3gvYy8wZGQ1NDU2YWRhMjc2YzU3L0lRQnpvbEc3UXBVUFJMbV9pc2Z4Uk1RZUFSMXlPaGNKc2JVUHBYa2gxZE1taXJ3P2U9ODhNS2hEJm5hdj1NVFZmZXpZeFFVVXpSamsyTFVRd04wWXRORGRFT0MwNE1UQTVMVFU1UkRZNE5rWkdPVUl5T0gw";
    
    try {
        const ctx = await initHeadedBrowser();
        const page = await ctx.newPage();
        console.log("Abrindo OneDrive para extração de contatos...");
        await page.goto(spreadsheetUrl, { waitUntil: 'load', timeout: 90000 });
        
        // Aguarda a renderização inicial do Excel
        try {
            await page.waitForSelector('.ewa-grid-cell, td', { timeout: 15000 });
        } catch (e) {
            console.log('⚠️ Planilha demorou a renderizar, aguardando mais 5s...');
            await page.waitForTimeout(5000);
        }

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
        const ctx = await initHeadedBrowser();
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
        const result = await tresCPlusRPA.dial(number);
        res.json(result);
    } catch (error) {
        console.error('Erro na rota dial-3c:', error);
        res.status(500).json({ error: error.message || 'Erro interno na discagem' });
    }
});

app.get('/open-whatsapp', async (req, res) => {
    try {
        const ctx = await initHeadedBrowser();
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
        const ctx = await initHeadedBrowser();
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
let processedVTMEOrders = new Set();
setInterval(() => {
    console.log("♻️ Limpando cache de pedidos processados para re-atualização...");
    processedVTMEOrders.clear();
}, 300000); 

app.get('/extract-vtme-macro', async (req, res) => {
    try {
        console.log("♻️ [VTME] Forçando limpeza de cache para extração manual da Macro...");
        vtmeRPA.clearCache();
        const result = await vtmeRPA.extractAuto();
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/extract-vtme-auto', async (req, res) => {
    try {
        const result = await vtmeRPA.extractAuto();
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/extract', async (req, res) => {
    try {
        const result = await vtmeRPA.extractManual();
        if (result.success) res.json(result.data);
        else res.status(400).json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
