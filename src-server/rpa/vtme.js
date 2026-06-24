import { initHeadedBrowser, autoLogin, setExtracting, isExtracting } from '../browser/manager.js';
import { loadSettings } from '../utils/storage.js';

let vtmeExtractionTimeout;
const processedVTMEOrders = new Set();

export class VTMERoboticAutomation {
    async getVTMEPage() {
        const ctx = await initHeadedBrowser();
        const pages = ctx.pages();
        let vtmePage = pages.find(p => p.url().includes('vtme2.orbitsistemas.com.br'));
        if (!vtmePage) {
            console.log("🚀 [VTME RPA] Auto-abertura do VTME...");
            vtmePage = await ctx.newPage();
            await vtmePage.goto('https://vtme2.orbitsistemas.com.br/agstelecom_v2/index.html#/pedido/gerenciarPedido', { waitUntil: 'load', timeout: 60000 });
        }
        return vtmePage;
    }

    async extractAuto() {
        if (isExtracting) {
            return { success: false, message: 'Robô ocupado processando a lista...' };
        }
        
        setExtracting(true);
        clearTimeout(vtmeExtractionTimeout);
        vtmeExtractionTimeout = setTimeout(() => {
            if (isExtracting) {
                console.warn('⚠️ Timeout de segurança: Extração VTME demorou mais de 5min. Liberando flag...');
                setExtracting(false);
            }
        }, 5 * 60 * 1000);

        try {
            const page = await this.getVTMEPage();
            const currentUrl = page.url();
            console.log(`🌐 URL Atual do VTME: ${currentUrl}`);

            const isLoginPage = currentUrl.includes('/login');
            const hasVisiblePassword = await page.evaluate(() => {
                const pwd = document.querySelector('input[type="password"]');
                if (!pwd) return false;
                const style = window.getComputedStyle(pwd);
                return style.display !== 'none' && style.visibility !== 'hidden' && pwd.offsetWidth > 0;
            });

            if (isLoginPage || hasVisiblePassword) {
                console.log("⚠️ VTME detectou tela de login...");
                const settings = loadSettings();
                await autoLogin(page, settings.vtmeUser, settings.vtmePass);
                return { success: false, message: 'Realizando Auto-Login no VTME...' };
            }

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

            await page.evaluate(() => {
                const select = document.querySelector('select[name="pageSize"], select[ng-model="pageSize"]');
                if (select) {
                    select.value = '50';
                    select.dispatchEvent(new Event('change'));
                }
            });
            await page.waitForTimeout(2000);

            const jaProcessados = Array.from(processedVTMEOrders);
            console.log(`🔍 Iniciando varredura profunda. Já processados hoje: ${jaProcessados.length}`);

            const extractedThisRound = await page.evaluate(async (alreadyProcessed) => {
                const results = [];
                let pagesProcessed = 0;
                const maxPages = 500; // Aumentado limite de páginas para extrair todos os registros

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
                        await new Promise(r => setTimeout(r, 2500));

                        const extractInfo = () => {
                            let cliente = "Desconhecido";
                            let cpf = checkId;
                            let uf = "--";
                            
                            const titleEl = document.querySelector('.cv-title');
                            if (titleEl) {
                                const fullText = titleEl.innerText.trim();
                                cliente = fullText.replace(/^[\d\.\-\/]+\s*/, '').trim() || "Desconhecido";
                            }
                            
                            const docEl = document.querySelector('orb-copy-value-v3[orb-type="cnpj"] span.ng-binding, orb-copy-value-v3[orb-type="cpf"] span.ng-binding');
                            if (docEl) {
                                cpf = docEl.innerText.trim();
                            } else if (titleEl) {
                                const match = titleEl.innerText.match(/^[\d\.\-\/]+/);
                                if (match) cpf = match[0].trim();
                            }

                            const endEl = document.querySelector('orb-icon-v3[name="endereco"]');
                            if (endEl) {
                                const row = endEl.closest('.orb-card-row-v3');
                                if (row) {
                                    const ufMatch = row.innerText.match(/\/\s*([A-Z]{2})/);
                                    if (ufMatch) uf = ufMatch[1].trim();
                                }
                            }

                            const getVal = (labelStr) => {
                                const elements = Array.from(document.querySelectorAll('label, b, strong, span, th, td'));
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

                            if (cliente === "Desconhecido" || cliente === "") {
                                const rawCliente = getVal('Cliente') || getVal('Nome') || "Desconhecido";
                                cliente = rawCliente.toLowerCase() === 'cliente' ? 'Desconhecido' : rawCliente;
                            }

                            if (cpf === checkId) {
                                const rawCpf = getVal('CPF') || checkId;
                                cpf = rawCpf.toLowerCase() === 'cpf' ? checkId : rawCpf;
                            }

                            if (uf === "--") {
                                uf = document.body.innerText.match(/\/\s*([A-Z]{2})/)?.[1] || "--";
                            }

                            const consultor = (getVal('Consultor') || "Consultor").split('-')[0].trim();
                            const supervisor = (getVal('Supervisor') || "Supervisor").split('-')[0].trim();
                            const textContent = document.body.innerText.toLowerCase();
                            const isCanc = textContent.includes("cancelamento operação") || textContent.includes("cancelamento operacao");
                            
                            return { 
                                cliente, cpf, 
                                consultor: consultor === 'Consultor' ? 'Não Identificado' : consultor,
                                supervisor: supervisor === 'Supervisor' ? 'Não Identificado' : supervisor,
                                uf,
                                statusCanc: isCanc ? "SOLICITADO" : "PENDENTE",
                                checkId
                            };
                        };

                        const info = extractInfo();
                        const closeBtn = Array.from(document.querySelectorAll('.modal-footer button, .modal-dialog button, .modal-content button, .modal button, .close, .btn-default, button[title="Fechar"]'))
                                            .find(b => b.innerText && /FECHAR|VOLTAR|SAIR/i.test(b.innerText.trim()));
                        if (closeBtn) closeBtn.click();
                        else document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));

                        await new Promise(r => setTimeout(r, 1200));

                        if (info.cliente !== "Desconhecido") {
                            results.push(info);
                            alreadyProcessed.push(checkId);
                            processedInThisPage++;
                        }
                    }

                    const paginationBtns = Array.from(document.querySelectorAll('.pagination li a, .pagination button, .pager a'));
                    const nextBtn = paginationBtns.find(b => b.innerText.trim() === '>' || b.innerText.includes('Próximo') || b.getAttribute('aria-label') === 'Next');
                    
                    if (nextBtn && !nextBtn.parentElement.classList.contains('disabled') && !nextBtn.hasAttribute('disabled')) {
                        console.log("⏭️ Indo para a próxima página...");
                        nextBtn.click();
                        pagesProcessed++;
                        await new Promise(r => setTimeout(r, 4000));
                    } else {
                        console.log("🏁 Fim da paginação ou botão 'Próximo' não encontrado.");
                        break; 
                    }
                }
                return results;
            }, jaProcessados);

            for (const item of extractedThisRound) {
                if (item.checkId) processedVTMEOrders.add(item.checkId);
            }

            if (extractedThisRound.length > 0) {
                console.log(`✅ Sucesso! ${extractedThisRound.length} novos registros processados.`);
            } else {
                console.log("🟡 Nenhum registro novo encontrado para processar nesta rodada.");
            }

            return { success: true, data: extractedThisRound };
        } catch (error) {
            console.error("Erro Auto VTME:", error.message);
            if (error.message.includes('Target page, context or browser has been closed') || error.message.includes('browser has been closed')) {
                setExtracting(false);
                return { success: false, message: 'Navegador foi fechado. Reiniciando na próxima tentativa...' };
            }
            throw error;
        } finally {
            setExtracting(false);
            clearTimeout(vtmeExtractionTimeout);
        }
    }

    async extractManual() {
        try {
            const page = await this.getVTMEPage();
            const modalStatus = await page.evaluate(() => {
                const isModalOpen = document.querySelector('orb-icon-v3') !== null || document.querySelector('.cv-title') !== null;
                if (!isModalOpen) {
                    const rows = Array.from(document.querySelectorAll('table[orb-relatorio-table] tbody tr, table.orb-gr2-table tbody tr, .ui-grid-row'));
                    for (const row of rows) {
                        const rowText = row.innerText || "";
                        if (rowText.trim() === "" || rowText.includes('Nenhum registro') || (rowText.includes('Cliente') && rowText.includes('CPF'))) continue;
                        const viewBtn = row.querySelector('.orb-icone-pedido, [title*="Resumo" i], [uib-tooltip*="Resumo" i], .fa-file-text-o, .fa-eye');
                        let btn = viewBtn ? (viewBtn.closest('button, a') || viewBtn.parentElement) : null;
                        if (!btn) {
                            const allBtns = Array.from(row.querySelectorAll('button, a'));
                            btn = allBtns.find(b => b.innerHTML.includes('pedido') || b.innerHTML.includes('file') || b.innerHTML.includes('resumo'));
                        }
                        if (btn) {
                            btn.click();
                            return { action: 'opened_modal' };
                        }
                    }
                    return { action: 'no_rows_found' };
                }
                return { action: 'already_open' };
            });

            if (modalStatus.action === 'opened_modal') {
                console.log("🤖 [Manual Extract] Modal estava fechado. Abrindo o primeiro contrato da lista...");
                await page.waitForTimeout(3500); 
            } else if (modalStatus.action === 'no_rows_found') {
                console.log("🟡 [Manual Extract] Modal fechado e nenhum contrato na lista.");
            }

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
                    if (telEl && !data.vtme_contato1) {
                        const strongsInternos = telEl.querySelectorAll('strong');
                        if (strongsInternos.length > 0) {
                            strongsInternos.forEach(si => {
                                if (si.innerText.includes('Contato 1') && si.nextElementSibling) {
                                    const val = si.nextElementSibling.innerText.replace('·', '').trim();
                                    if (isValidPhoneNumber(val)) data.vtme_contato1 = val;
                                }
                                if (si.innerText.includes('Contato 2') && si.nextElementSibling) {
                                    const val = si.nextElementSibling.innerText.replace('·', '').trim();
                                    if (isValidPhoneNumber(val)) data.vtme_contato2 = val;
                                }
                            });
                        } else {
                            const spans = telEl.querySelectorAll('span.ng-binding');
                            if (spans.length > 0) {
                                let telefonesList = Array.from(spans).map(s => s.innerText.replace('·', '').trim()).filter(txt => txt.length > 0 && isValidPhoneNumber(txt));
                                if (telefonesList[0]) data.vtme_contato1 = telefonesList[0];
                                if (telefonesList[1]) data.vtme_contato2 = telefonesList[1];
                            } else {
                                const val = telEl.innerText.trim();
                                if (isValidPhoneNumber(val)) data.vtme_contato1 = val;
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

                const pageText = document.body.innerText;
                if (!data.cnpj) {
                    const cnpjMatch = pageText.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2}/) || pageText.match(/\b\d{14}\b/);
                    if (cnpjMatch) data.cnpj = cnpjMatch[0];
                }

                if (!data.uf) {
                    const ufMatch = pageText.match(/[\/\-]\s*([A-Z]{2})\s*$/m) || pageText.match(/[\/\-]\s*([A-Z]{2})\b/);
                    if (ufMatch) data.uf = ufMatch[1].toUpperCase().trim();
                }

                // --- POS-PROCESSAMENTO E VALIDACAO CPF VS CNPJ ---
                if (data.cpf_cliente) {
                    const cleanDoc = data.cpf_cliente.replace(/\D/g, '');
                    if (cleanDoc.length === 14) {
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
                    finalCPF = data.cnpj_cpf_rep || data.cpf_cliente || "";
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
                    protocolo: data.protocolo || ""
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

            if (modalStatus.action === 'opened_modal') {
                await page.evaluate(() => {
                    const closeBtn = Array.from(document.querySelectorAll('.modal-footer button, .modal-dialog button, .modal-content button, .modal button, .close, .btn-default, button[title="Fechar"]'))
                                        .find(b => b.innerText && /FECHAR|VOLTAR|SAIR/i.test(b.innerText.trim()));
                    if (closeBtn) closeBtn.click();
                });
            }

            return { success: true, data };
        } catch (error) {
            if (error.message === 'VTME_NOT_OPEN') {
                return { success: false, error: 'Abra o VTME pelo menu lateral primeiro.' };
            }
            throw error;
        }
    }
}

export const vtmeRPA = new VTMERoboticAutomation();
