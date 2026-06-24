import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
chromium.use(StealthPlugin());
import path from 'path';
import { browserLogHandler } from '../utils/logger.js';

let headlessBrowser = null;
let headlessContext = null;
let initHeadlessPromise = null;

let headedBrowser = null;
let headedContext = null;
let initHeadedPromise = null;

export let isExtracting = false;
export let isExtractingTim = false;

export async function initHeadlessBrowser() {
    if (headlessBrowser) {
        try {
            await headlessContext.cookies();
            return headlessContext;
        } catch (e) {
            console.log("⚠️ Contexto do navegador headless inválido. Reiniciando...");
            headlessBrowser = null; headlessContext = null; initHeadlessPromise = null;
        }
    }
    if (initHeadlessPromise) return initHeadlessPromise;

    initHeadlessPromise = (async () => {
        console.log("🚀 Iniciando Navegador Automático VTME (Headless em Background)...");
        const userDataPath = path.join(process.cwd(), 'user_data_headless');
        const ctx = await chromium.launchPersistentContext(userDataPath, {
            headless: true,
            channel: 'msedge', // Força o uso do Edge mesmo em modo invisível
            args: ['--start-maximized', '--use-fake-ui-for-media-stream', '--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-setuid-sandbox'],
            viewport: null,
            permissions: ['microphone', 'camera', 'notifications', 'clipboard-read', 'clipboard-write']
        });

        await ctx.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
            window.chrome = { runtime: {}, app: {} };
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            Object.defineProperty(navigator, 'languages', { get: () => ['pt-BR', 'pt', 'en-US', 'en'] });
        });

        ctx.on('close', () => {
            console.log("❌ Navegador headless foi fechado. Limpando instâncias...");
            headlessBrowser = null; headlessContext = null; initHeadlessPromise = null;
            isExtracting = false;
        });

        ctx.on('page', p => { 
            const handler = (msg) => browserLogHandler(msg, 'HEADLESS');
            p.on('console', handler); 
            p.once('close', () => p.removeListener('console', handler)); 
        });
        
        headlessContext = ctx;
        headlessBrowser = ctx;
        return ctx;
    })();
    try { return await initHeadlessPromise; } catch (err) { initHeadlessPromise = null; throw err; }
}

export async function initHeadedBrowser() {
    if (headedBrowser) {
        try {
            await headedContext.cookies();
            return headedContext;
        } catch (e) {
            console.log("⚠️ Contexto do navegador headed inválido. Reiniciando...");
            headedBrowser = null; headedContext = null; initHeadedPromise = null;
        }
    }
    if (initHeadedPromise) return initHeadedPromise;

    initHeadedPromise = (async () => {
        console.log("🚀 Iniciando Navegador Automático TIM/Outros (Visível)...");
        const userDataPath = path.join(process.cwd(), 'user_data');
        const ctx = await chromium.launchPersistentContext(userDataPath, {
            headless: false,
            channel: 'msedge', // Força o uso do Microsoft Edge nativo do usuário
            args: ['--start-maximized', '--use-fake-ui-for-media-stream', '--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-setuid-sandbox'],
            viewport: null,
            permissions: ['microphone', 'camera', 'notifications', 'clipboard-read', 'clipboard-write']
        });

        await ctx.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
            window.chrome = { runtime: {}, app: {} };
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            Object.defineProperty(navigator, 'languages', { get: () => ['pt-BR', 'pt', 'en-US', 'en'] });
        });

        ctx.on('close', () => {
            console.log("❌ Navegador headed foi fechado. Limpando instâncias...");
            headedBrowser = null; headedContext = null; initHeadedPromise = null;
            isExtractingTim = false;
        });

        ctx.on('page', p => { 
            const handler = (msg) => browserLogHandler(msg, 'HEADED');
            p.on('console', handler); 
            p.once('close', () => p.removeListener('console', handler)); 
        });
        
        headedContext = ctx;
        headedBrowser = ctx;
        return ctx;
    })();
    try { return await initHeadedPromise; } catch (err) { initHeadedPromise = null; throw err; }
}

export async function isBrowserActive() {
    let ok = false;
    if (headlessBrowser) {
        try { await headlessContext.cookies(); ok = true; } catch (e) { headlessBrowser = null; headlessContext = null; initHeadlessPromise = null; }
    }
    if (headedBrowser) {
        try { await headedContext.cookies(); ok = true; } catch (e) { headedBrowser = null; headedContext = null; initHeadedPromise = null; }
    }
    return ok;
}

export function getHeadlessContext() { return headlessContext; }
export function getHeadedContext() { return headedContext; }
export function setExtracting(val) { isExtracting = val; }
export function setExtractingTim(val) { isExtractingTim = val; }

export async function closeBrowsers() {
    if (headedBrowser) await headedBrowser.close().catch(()=>{});
    if (headlessBrowser) await headlessBrowser.close().catch(()=>{});
}

// Helpers compartilhados de navegador
export async function autoLogin(page, user, pass) {
    console.log(`⚠️ Iniciando injeção de credenciais em background para ${page.url()}`);
    await page.evaluate(async ({user, pass}) => {
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        const pwdInput = document.querySelector('input[type="password"]');
        if (!pwdInput) return;
        const textInputs = Array.from(document.querySelectorAll('input[type="text"], input[type="email"], input[name*="user"], input[name*="login"], input[name*="usuario"], input[ng-model*="usuario"]'));
        const visibleTextInputs = textInputs.filter(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetWidth > 0;
        });
        let userInput = visibleTextInputs.find(el => el !== pwdInput);
        const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], a.btn'));
        const loginBtn = buttons.find(b => {
            const text = (b.innerText || b.value || "").toLowerCase();
            return text.includes('entrar') || text.includes('login') || text.includes('acessar') || text.includes('sign in');
        });
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        if (userInput && pwdInput) {
            userInput.focus();
            nativeSetter.call(userInput, user);
            userInput.dispatchEvent(new Event('input', { bubbles: true }));
            userInput.dispatchEvent(new Event('change', { bubbles: true }));
            await delay(300);
            pwdInput.focus();
            nativeSetter.call(pwdInput, pass);
            pwdInput.dispatchEvent(new Event('input', { bubbles: true }));
            pwdInput.dispatchEvent(new Event('change', { bubbles: true }));
            await delay(300);
            if (loginBtn) {
                loginBtn.click();
            } else {
                pwdInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
            }
        }
    }, { user, pass });
}
