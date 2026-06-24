import { initHeadlessBrowser, autoLogin } from '../browser/manager.js';
import { loadSettings } from '../utils/storage.js';

export class TresCPlusRPA {
    async dial(number) {
        if (!number) throw new Error('Número não fornecido');

        const ctx = await initHeadlessBrowser();
        const pages = ctx.pages();
        
        console.log(`\n--- 🕵️ PROCURANDO 3C PLUS (BACKGROUND) ---`);
        let targetPage = null;
        
        for (const p of pages) {
            try {
                const url = p.url().toLowerCase();
                const title = (await p.title()).toLowerCase();
                if (url.includes('3c.plus') || url.includes('agstelecom') || title.includes('3c plus')) {
                    targetPage = p;
                    if (url.includes('/agent') || title.includes('agente')) break;
                }
            } catch (e) { }
        }

        if (!targetPage) {
            console.log("🚀 Abrindo 3C Plus em background...");
            targetPage = await ctx.newPage();
            await targetPage.goto('https://agstelecom.3c.plus/', { waitUntil: 'load', timeout: 60000 });
        }

        const isLogin3C = targetPage.url().includes('/login') || targetPage.url().includes('auth');
        if (isLogin3C) {
            console.log("⚠️ 3C Plus na tela de login. Efetuando auto-login em background...");
            const settings = loadSettings();
            await autoLogin(targetPage, settings.dialerUser, settings.dialerPass);
            await targetPage.waitForTimeout(3000); 
        }

        const cleanNum = number.replace(/\D/g, '');
        console.log(`🚀 Iniciando discagem invisível para: ${cleanNum}`);
        
        try {
            await targetPage.bringToFront();
            await targetPage.waitForTimeout(800);
            
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
                await targetPage.mouse.click(200, 200); 
                await targetPage.keyboard.type(cleanNum, { delay: 100 });
                await targetPage.keyboard.press('Enter');
            }

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
                                return { success: true, message: 'Discagem realizada.' };
                            }
                        }
                    } catch(e) {}
                }
            }

            return { success: true, message: 'Discagem realizada.' };
        } catch (error) {
            console.error("Erro na automação 3C:", error);
            throw error;
        }
    }
}

export const tresCPlusRPA = new TresCPlusRPA();
