import { initHeadedBrowser, isExtractingTim, setExtractingTim } from '../browser/manager.js';
import { loadSettings } from '../utils/storage.js';
import * as fs from 'fs';

export class TimVendasRPA {
    constructor() {
        this.page = null;
    }

    async init() {
        const ctx = await initHeadedBrowser();
        const pages = ctx.pages();
        this.page = pages.find(p => p.url().includes('apptimvendas.timbrasil.com.br'));
        if (!this.page) {
            this.page = await ctx.newPage();
            await this.page.goto('https://apptimvendas.timbrasil.com.br/#/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
        } else {
            await this.page.bringToFront();
        }
        return this.page;
    }

    async login(user, token) {
        if (!this.page) await this.init();
        console.log(`🤖 [TIM RPA] Iniciando injeção furtiva de credenciais (RPA Profissional)...`);
        
        await this.page.waitForSelector('input', { state: 'visible', timeout: 15000 }).catch(() => null);
        await this.page.waitForTimeout(1000);

        const textLocators = await this.page.locator('input[type="text"], input:not([type]), input[type="email"]').all();
        let matLocator = null;
        for (const loc of textLocators) {
            if (await loc.isVisible()) { matLocator = loc; break; }
        }

        const passLocators = await this.page.locator('input[type="password"]').all();
        let tokenLocator = null;
        for (const loc of passLocators) {
            if (await loc.isVisible()) { tokenLocator = loc; break; }
        }
        
        if (!tokenLocator && textLocators.length >= 2) {
            let visibleCount = 0;
            for (const loc of textLocators) {
                if (await loc.isVisible()) {
                    visibleCount++;
                    if (visibleCount === 2) { tokenLocator = loc; break; }
                }
            }
        }

        if (matLocator && tokenLocator) {
            await matLocator.click({ delay: Math.floor(Math.random() * 100) });
            await matLocator.fill('');
            await this.page.waitForTimeout(200);
            await matLocator.pressSequentially(user, { delay: Math.floor(Math.random() * 50) + 30 }); 
            
            await tokenLocator.click({ delay: Math.floor(Math.random() * 100) });
            await tokenLocator.fill('');
            await this.page.waitForTimeout(200);
            await tokenLocator.pressSequentially(token, { delay: Math.floor(Math.random() * 50) + 30 });
            
            await this.page.waitForTimeout(500);

            const btnLocators = await this.page.locator('button, a.btn, input[type="button"], input[type="submit"]').all();
            let loginBtn = null;
            for (const loc of btnLocators) {
                if (await loc.isVisible()) {
                    const text = (await loc.textContent()).toLowerCase();
                    const value = (await loc.getAttribute('value') || "").toLowerCase();
                    if (text.includes('login') || text.includes('entrar') || text.includes('acessar') || value.includes('login') || value.includes('entrar')) {
                        loginBtn = loc;
                        break;
                    }
                }
            }

            if (loginBtn) {
                await loginBtn.click({ delay: Math.floor(Math.random() * 100) + 50 });
            } else {
                await tokenLocator.press('Enter', { delay: Math.floor(Math.random() * 100) + 50 });
            }

            try {
                await this.page.waitForFunction(() => {
                    return !window.location.href.includes('login') && !window.location.href.includes('auth');
                }, { timeout: 15000 });
                console.log(`✅ [TIM RPA] Login furtivo concluído com sucesso! (Autenticado)`);
                return { success: true };
            } catch (err) {
                console.error(`❌ [TIM RPA] TIM rejeitou o login, ou estourou o tempo limite.`);
                return { success: false, message: 'TIM Vendas rejeitou o login. Verifique sua Matrícula e Token RSA. Se estiverem corretos, o acesso do seu usuário está restrito na TIM.' };
            }
        }
        
        return { success: false, message: 'Formulário de login não foi encontrado na tela. Verifique a aba aberta.' };
    }

    async isLogged() {
        if (!this.page) return false;
        try {
            const url = this.page.url();
            return !url.includes('login') && !url.includes('auth');
        } catch { return false; }
    }

    /**
     * Aguarda overlays de carregamento do Ionic desaparecerem.
     * O ion-loading cria um backdrop que intercepta TODOS os eventos de ponteiro,
     * impedindo o Playwright de clicar em qualquer elemento por trás.
     */
    async waitForLoadingOverlay(maxWait = 30000) {
        console.log("⏳ [TIM RPA] Verificando overlays de carregamento...");
        
        const startTime = Date.now();
        while (Date.now() - startTime < maxWait) {
            const hasOverlay = await this.page.evaluate(() => {
                const loading = document.querySelector('ion-loading');
                if (!loading) return false;
                const style = window.getComputedStyle(loading);
                return style.display !== 'none' && style.visibility !== 'hidden' && loading.offsetParent !== null;
            });

            if (!hasOverlay) {
                console.log("✅ [TIM RPA] Nenhum overlay de carregamento ativo.");
                return true;
            }

            console.log("⏳ [TIM RPA] Overlay 'Carregando dados...' detectado. Aguardando...");
            await this.page.waitForTimeout(1000);
        }

        // Se o overlay não saiu após maxWait, tenta removê-lo forçadamente via JS
        console.warn("⚠️ [TIM RPA] Overlay travou. Removendo forçadamente via JavaScript...");
        await this.page.evaluate(() => {
            const loadings = document.querySelectorAll('ion-loading');
            loadings.forEach(el => el.remove());
            const backdrops = document.querySelectorAll('ion-backdrop');
            backdrops.forEach(el => {
                if (el.closest('ion-loading')) el.remove();
            });
        });
        await this.page.waitForTimeout(500);
        return true;
    }

    /**
     * BUG 2 FIX: Trata a tela intermediária de "Seleção do(a) vendedor(a)"
     * que aparece após login. Preenche a matrícula e avança.
     */
    async handleSellerSelection() {
        console.log("🔍 [TIM RPA] Verificando se está na tela de seleção de vendedor...");
        
        // Detecta se a página atual é a tela de seleção de vendedor
        const isSellerPage = await this.page.evaluate(() => {
            const pageEl = document.querySelector('page-seller-selection');
            if (pageEl) return true;
            // Fallback: verifica pelo título na toolbar
            const titles = Array.from(document.querySelectorAll('.toolbar-title, ion-title'));
            return titles.some(t => t.innerText && t.innerText.toLowerCase().includes('vendedor'));
        });

        if (!isSellerPage) {
            console.log("✅ [TIM RPA] Não está na tela de seleção de vendedor. Prosseguindo...");
            return true;
        }

        console.log("📝 [TIM RPA] Tela de seleção de vendedor detectada. Preenchendo matrícula...");
        
        // Aguardar overlay de carregamento desaparecer antes de interagir
        await this.waitForLoadingOverlay();
        
        const settings = loadSettings();
        const matricula = settings.timUser;
        
        if (!matricula) {
            console.warn("⚠️ [TIM RPA] Matrícula TIM (timUser) não configurada nas Configurações!");
            console.warn("⚠️ [TIM RPA] Configure a matrícula em Configurações > TIM Vendas e tente novamente.");
            // Tenta esperar para ver se a tela avança sozinha (em alguns fluxos o vendedor é auto-selecionado)
            await this.page.waitForTimeout(5000);
            const stillOnSellerPage = await this.page.evaluate(() => !!document.querySelector('page-seller-selection'));
            if (stillOnSellerPage) {
                return false;
            }
            return true;
        }

        // Localizar o input de matrícula
        const matInput = this.page.locator('page-seller-selection input[type="text"], page-seller-selection ion-input input').first();
        if (await matInput.isVisible({ timeout: 5000 }).catch(() => false)) {
            await matInput.click();
            await matInput.fill('');
            await this.page.waitForTimeout(300);
            await matInput.pressSequentially(matricula, { delay: 40 });
            await this.page.waitForTimeout(500);

            // Clicar no botão "Buscar"
            const buscarBtn = this.page.locator('page-seller-selection button').filter({ hasText: /buscar/i }).first();
            if (await buscarBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                await buscarBtn.click();
                console.log("🔍 [TIM RPA] Clicou em 'Buscar'. Aguardando resultado...");
                await this.page.waitForTimeout(3000);
            } else {
                // Tenta dar Enter no input como alternativa
                await matInput.press('Enter');
                await this.page.waitForTimeout(3000);
            }

            // Clicar no botão "Próximo"
            const proximoBtn = this.page.locator('#button-next, page-seller-selection button').filter({ hasText: /próximo/i }).first();
            if (await proximoBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
                await proximoBtn.click();
                console.log("➡️ [TIM RPA] Clicou em 'Próximo'. Avançando...");
                await this.page.waitForTimeout(3000);
            } else {
                console.warn("⚠️ [TIM RPA] Botão 'Próximo' não encontrado. Tentando continuar...");
            }
        } else {
            console.warn("⚠️ [TIM RPA] Input de matrícula não encontrado na tela de seleção de vendedor.");
        }

        return true;
    }

    /**
     * BUG 2 FIX: Trata a tela de escolha de produto (ULTRAFIBRA)
     */
    async handleProductChoice() {
        const currentUrl = this.page.url();
        if (currentUrl.includes('choice-product')) {
            console.log("🔄 [TIM RPA] Tela de escolha de produto detectada. Selecionando ULTRAFIBRA...");
            const ultrafibraBtn = this.page.locator('button, .button, a').filter({ hasText: /ULTRAFIBRA/i }).first();
            if (await ultrafibraBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
                await ultrafibraBtn.click();
                await this.page.waitForTimeout(3000);
            }
        }
    }

    /**
     * BUG 3 FIX: Abre o menu hambúrguer com seletores robustos
     */
    async openHamburgerMenu() {
        console.log("🔄 [TIM RPA] Abrindo menu hambúrguer...");
        
        // CRUCIAL: Aguardar overlay de carregamento desaparecer
        await this.waitForLoadingOverlay();
        
        // Verificar se o menu lateral já está aberto
        const menuAlreadyOpen = await this.page.evaluate(() => {
            const menu = document.querySelector('ion-menu');
            return menu && menu.classList.contains('show-menu');
        });
        
        if (menuAlreadyOpen) {
            console.log("✅ [TIM RPA] Menu lateral já está aberto.");
            return true;
        }
        
        // Lista de seletores do mais específico ao mais genérico (baseados no DOM real do app Ionic)
        const menuSelectors = [
            'button.bar-button-menutoggle',           // Classe CSS real do DOM dump
            'button[menutoggle]',                      // Atributo Ionic Angular
            '.bar-button-menutoggle-md',               // Classe MD-specific
            'ion-icon[name="menu"]',                   // Ícone do menu dentro do botão
            'button:has(ion-icon[name="menu"])',        // Botão pai do ícone menu
        ];

        for (const selector of menuSelectors) {
            const menuBtn = this.page.locator(selector).first();
            if (await menuBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                try {
                    // Tenta clique normal primeiro
                    await menuBtn.click({ timeout: 5000 });
                    console.log(`✅ [TIM RPA] Menu aberto usando seletor: ${selector}`);
                    await this.page.waitForTimeout(1500);
                    return true;
                } catch (clickErr) {
                    // Se falhou por overlay, tenta com force: true
                    console.warn(`⚠️ [TIM RPA] Clique normal falhou em ${selector}: ${clickErr.message.split('\n')[0]}`);
                    try {
                        await menuBtn.click({ force: true, timeout: 5000 });
                        console.log(`✅ [TIM RPA] Menu aberto via force click: ${selector}`);
                        await this.page.waitForTimeout(1500);
                        return true;
                    } catch (forceErr) {
                        console.warn(`⚠️ [TIM RPA] Force click também falhou: ${forceErr.message.split('\n')[0]}`);
                    }
                }
            }
        }
        
        // Último recurso: abrir menu via JavaScript
        console.warn("⚠️ [TIM RPA] Todos os seletores falharam. Abrindo menu via JavaScript...");
        const jsMenuOpened = await this.page.evaluate(() => {
            // Tenta abrir via Angular's MenuController ou via DOM direto
            const menu = document.querySelector('ion-menu');
            if (menu) {
                menu.classList.add('show-menu', 'menu-enabled');
                menu.style.transform = 'translateX(0px)';
                const menuInner = menu.querySelector('.menu-inner');
                if (menuInner) menuInner.style.transform = 'translateX(0px)';
                // Mostrar backdrop
                const backdrop = menu.parentElement?.querySelector('ion-backdrop') || menu.nextElementSibling;
                if (backdrop) {
                    backdrop.classList.add('show-backdrop');
                    backdrop.style.opacity = '0.35';
                }
                return true;
            }
            return false;
        });
        
        if (jsMenuOpened) {
            console.log("✅ [TIM RPA] Menu aberto via manipulação direta do DOM.");
            await this.page.waitForTimeout(1000);
            return true;
        }

        console.error("❌ [TIM RPA] Nenhum método conseguiu abrir o menu!");
        return false;
    }

    /**
     * Navega até "Pedidos Cadastrados" pelo menu lateral
     */
    async navigateToPedidosCadastrados() {
        // Clicar em "Pedidos Cadastrados" no menu
        const btnPedidos = this.page.locator('ion-menu ion-item, ion-menu ion-label').filter({ hasText: /Pedidos Cadastrados/i }).first();
        if (await btnPedidos.isVisible({ timeout: 5000 }).catch(() => false)) {
            await btnPedidos.click();
            console.log("✅ [TIM RPA] Clicou em 'Pedidos Cadastrados'");
            await this.page.waitForTimeout(2000);
            return true;
        }
        
        // Fallback: tenta via texto genérico 
        const fallbackBtn = this.page.locator('text=/Pedidos Cadastrados/i').first();
        if (await fallbackBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await fallbackBtn.click();
            console.log("✅ [TIM RPA] Clicou em 'Pedidos Cadastrados' (fallback)");
            await this.page.waitForTimeout(2000);
            return true;
        }

        console.warn("⚠️ [TIM RPA] 'Pedidos Cadastrados' não encontrado no menu!");
        return false;
    }

    /**
     * Garante que o menu hambúrguer / lateral esteja fechado.
     */
    async closeHamburgerMenu() {
        console.log("🔄 [TIM RPA] Garantindo que o menu lateral esteja fechado...");
        await this.page.evaluate(() => {
            const menu = document.querySelector('ion-menu');
            if (menu) {
                if (typeof menu.close === 'function') {
                    menu.close();
                } else {
                    menu.classList.remove('show-menu');
                    const menuInner = menu.querySelector('.menu-inner');
                    if (menuInner) menuInner.style.transform = 'translateX(-260px)';
                    const backdrop = menu.parentElement?.querySelector('ion-backdrop') || menu.nextElementSibling;
                    if (backdrop && backdrop.tagName.toLowerCase() === 'ion-backdrop') {
                        backdrop.classList.remove('show-backdrop');
                        backdrop.style.opacity = '0';
                        backdrop.style.pointerEvents = 'none';
                    }
                }
            }
        });
        await this.page.waitForTimeout(1000);
    }

    /**
     * Navega para Visualização Detalhada e aplica filtros
     */
    async applyFilters() {
        // Visualização Detalhada
        const btnDetalhada = this.page.locator('text=/Visualização Detalhada/i').first();
        if (await btnDetalhada.isVisible({ timeout: 5000 }).catch(() => false)) {
            await btnDetalhada.click();
            console.log("✅ [TIM RPA] Clicou em 'Visualização Detalhada'");
            await this.page.waitForTimeout(2000);
        }

        // Omitido Filtro de Período conforme fluxo solicitado pelo usuário.

        // Filtro Status -> Em andamento
        console.log("🔄 [TIM RPA] Tentando abrir o filtro de Status...");
        const statusItem = this.page.locator('ion-item, .item').filter({ hasText: /Status/i }).first();
        const statusLabel = this.page.locator('text=/Status/i').first();
        const todosLabel = this.page.locator('text=/Todos/i').first();
        
        let statusOpened = false;
        if (await statusItem.isVisible({ timeout: 2000 }).catch(() => false)) {
            await statusItem.click({ force: true }); statusOpened = true;
        } else if (await todosLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
            await todosLabel.click({ force: true }); statusOpened = true;
        } else if (await statusLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
            await statusLabel.click({ force: true }); statusOpened = true;
        }

        if (statusOpened) {
            await this.page.waitForTimeout(1500);
            const btnEmAndamento = this.page.locator('button, .alert-radio-label, .action-sheet-button, ion-item').filter({ hasText: /^Em andamento$/i }).first();
            const fallbackEmAndamento = this.page.locator('text=/Em andamento/i').first();
            
            if (await btnEmAndamento.isVisible({ timeout: 3000 }).catch(() => false)) {
                await btnEmAndamento.click({ force: true });
            } else if (await fallbackEmAndamento.isVisible({ timeout: 3000 }).catch(() => false)) {
                await fallbackEmAndamento.click({ force: true });
            }

            await this.page.waitForTimeout(1000);
            // Se for um ion-alert com botão OK, precisa clicar para confirmar
            const okBtn = this.page.locator('button').filter({ hasText: /^OK$|^Confirmar$/i }).last();
            if (await okBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
                await okBtn.click({ force: true });
            }
            await this.page.waitForTimeout(2000);
            console.log("✅ [TIM RPA] Filtro 'Em andamento' aplicado.");
        } else {
            console.warn("⚠️ [TIM RPA] Não conseguiu abrir o dropdown de Status.");
        }
    }

    /**
     * BUG 4 FIX: Clica no botão "Carregar próximos pedidos" usando Playwright locators
     * ao invés de document.querySelector dentro do evaluate.
     * Retorna true se conseguiu carregar mais, false se não há mais páginas.
     */
    async clickLoadMoreButton() {
        console.log("🔄 [TIM RPA] Procurando botão de paginação...");

        // Textos possíveis para o botão de carregar mais pedidos (case insensitive)
        const loadMoreTexts = [
            /carregar\s*próximos?\s*pedidos?/i,
            /carregar\s*próxim/i,
            /carregar\s*mais/i,
            /próximos?\s*pedidos?/i,
            /ver\s*mais/i,
            /load\s*more/i,
            /mais\s*pedidos/i,
        ];

        for (const textPattern of loadMoreTexts) {
            // Tenta por button e ion-button
            const btn = this.page.locator('button, ion-button, a.button, a.btn').filter({ hasText: textPattern }).first();
            if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
                const isDisabled = await btn.getAttribute('disabled').catch(() => null);
                if (isDisabled !== null && isDisabled !== 'false') {
                    console.log("⚠️ [TIM RPA] Botão de paginação encontrado mas está desabilitado.");
                    return false;
                }
                
                await btn.scrollIntoViewIfNeeded().catch(() => {});
                await this.page.waitForTimeout(500);
                await btn.click();
                console.log(`✅ [TIM RPA] Botão de paginação clicado (padrão: ${textPattern})`);
                return true;
            }
        }

        // Fallback: Tenta encontrar por seletor ">" (paginação numérica)
        const nextPageBtn = this.page.locator('.pagination li a, .pagination button, .pager a, .page-link, .next').filter({ hasText: '>' }).first();
        if (await nextPageBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await nextPageBtn.scrollIntoViewIfNeeded().catch(() => {});
            await this.page.waitForTimeout(500);
            await nextPageBtn.click();
            console.log("✅ [TIM RPA] Botão de próxima página '>' clicado.");
            return true;
        }

        // Fallback 2: Ionic infinite-scroll (rolar até o final para trigger automático)
        const infiniteScroll = this.page.locator('ion-infinite-scroll').first();
        if (await infiniteScroll.isVisible({ timeout: 1000 }).catch(() => false)) {
            const isDisabled = await infiniteScroll.getAttribute('disabled').catch(() => null);
            if (isDisabled === null || isDisabled === 'false') {
                console.log("🔄 [TIM RPA] ion-infinite-scroll detectado. Rolando para disparar carregamento...");
                const scrollContainer = this.page.locator('page-detailed-view .scroll-content, .scroll-content, ion-content').first();
                await scrollContainer.evaluate(el => el.scrollTop = el.scrollHeight);
                await this.page.waitForTimeout(2000);
                return true;
            }
        }

        console.log("📋 [TIM RPA] Nenhum botão de paginação encontrado. Todos os pedidos visíveis foram processados.");
        return false;
    }

    async extractAuto(processedTimOrders) {
        if (isExtractingTim) {
            console.warn("⚠️ [TIM RPA] Extração bloqueada: Uma extração TIM já está em andamento (evitando sobreposição de cliques).");
            return { success: false, message: "A extração TIM já está rodando em background." };
        }
        setExtractingTim(true);

        try {
            if (!this.page) await this.init();
            console.log("🚀 [TIM RPA] Usuário logado, iniciando extração automática conforme fluxo solicitado...");

            // PRIMEIRO: Aguardar qualquer overlay de carregamento inicial
            await this.waitForLoadingOverlay();

            const jaProcessados = Array.from(processedTimOrders || []);

            let currentUrl = this.page.url();
            
            // Redirecionamento se estiver na escolha do produto
            if (currentUrl.includes('choice-product')) {
                console.log("🔄 [TIM RPA] Tela choice-product detectada. Retornando para a página inicial (Home) antes de continuar...");
                await this.page.goto('https://apptimvendas.timbrasil.com.br/#/home', { waitUntil: 'domcontentloaded' });
                await this.page.waitForTimeout(2000);
                await this.waitForLoadingOverlay();
                currentUrl = this.page.url();
            }

            if (currentUrl.includes('detailed-view')) {
                console.log("⏭️ [TIM RPA] Já estamos na tela detailed-view. Pulando navegação do menu...");
            } else {
                console.log("🔄 [TIM RPA] Abrindo menu hambúrguer a partir da tela atual...");
                // BUG 3 FIX: Menu hamburger com seletores robustos
                await this.openHamburgerMenu();

                // Navegar para Pedidos Cadastrados
                await this.navigateToPedidosCadastrados();
                await this.waitForLoadingOverlay();
            }

            // Garante que o menu lateral esteja fechado para não sobrepor a tela de filtros
            await this.closeHamburgerMenu();

            // Aplicar filtros (Visualização detalhada -> Status Em andamento)
            await this.applyFilters();
            await this.waitForLoadingOverlay();

            console.log("⏳ [TIM RPA] Filtros aplicados. Carregando dados...");
            await this.page.waitForTimeout(4000);
            
            // DUMP do DOM para debug
            try {
                const html = await this.page.content();
                fs.writeFileSync('tim_dom_dump.html', html);
                console.log("💾 [TIM RPA] DOM salvo em tim_dom_dump.html para análise das tags.");
            } catch (e) {
                console.error("Erro ao salvar DOM", e);
            }

            console.log("⬇️ [TIM RPA] Iniciando paginação contínua até o final da lista...");
            let canLoadMore = true;
            let loadAttempts = 0;
            
            while (canLoadMore && loadAttempts < 100) { // limite de segurança de 100 páginas
                const loadedMore = await this.clickLoadMoreButton();
                if (loadedMore) {
                    console.log(`⏳ [TIM RPA] Aguardando carregamento da página ${loadAttempts + 2}...`);
                    await this.page.waitForTimeout(3000); // Espera o DOM injetar os novos cards
                    await this.waitForLoadingOverlay();
                    loadAttempts++;
                } else {
                    canLoadMore = false;
                    console.log("✅ [TIM RPA] Chegou ao final da lista (ou botão sumiu).");
                }
            }

            console.log("📦 [TIM RPA] Todos os pedidos carregados. Iniciando extração dos dados...");
            
            // Extrair dados de TODOS os cards visíveis de uma vez
            const allResults = await this.page.evaluate(async (args) => {
                const { alreadyProcessed } = args;
                const delay = (ms) => new Promise(r => setTimeout(r, ms));
                const results = [];

                let items = Array.from(document.querySelectorAll('page-detailed-view ion-list ion-item'));
                console.log(`📦 [TIM RPA] Lote total para extração: ${items.length} itens encontrados na tela.`);

                for (let i = 0; i < items.length; i++) {
                    const card = items[i];
                    if (!card) continue;

                    const cardText = card.innerText.toLowerCase();
                    if (!cardText.includes('em andamento')) continue;

                    const rows = Array.from(card.querySelectorAll('ion-row[outter-row]'));
                    const ordem = rows[1]?.innerText.match(/1-\d+/)?.[0] || `TEMP_${Date.now()}_${i}`;

                    if (alreadyProcessed.includes(ordem)) {
                        console.log(`Ignorando ordem já processada: ${ordem}`);
                        continue;
                    }

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
                            while (attempts < 3) {
                                chevron.click();
                                await delay(2000);
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

                                if (dataInst !== '--' && !dataInst.toLowerCase().includes('falha')) {
                                    chevron.click(); await delay(500); break;
                                } else {
                                    chevron.click(); await delay(1000 * (attempts + 1));
                                    attempts++;
                                }
                            }
                        }
                    }
                    results.push({ nome, cpf, ordem, data: dataVenda, status: 'Em andamento', datainst: dataInst, statusinst: statusInst });
                }
                return results;
            }, { alreadyProcessed: jaProcessados });

            console.log(`🏁 [TIM RPA] Extração concluída! Total de pedidos: ${allResults.length}`);
            return { success: true, data: allResults };
        } catch (error) {
            console.error("❌ [TIM RPA] CRITICAL ERROR IN EXTRACT AUTO:", error);
            return { success: false, message: error.message };
        } finally {
            setExtractingTim(false);
            console.log("🔓 [TIM RPA] Lock de extração liberado.");
        }
    }
}

export const timRPA = new TimVendasRPA();
