import { initHeadlessBrowser } from '../browser/manager.js';
import { EventEmitter } from 'events';

class WhatsAppEngine extends EventEmitter {
    constructor() {
        super();
        this.status = 'IDLE'; // IDLE, RUNNING, PAUSED
        this.queue = [];
        this.messageTemplate = '';
        this.progress = { total: 0, sent: 0, errors: 0 };
        this.shouldStop = false;
        this.waPage = null;
    }

    async getPage() {
        if (!this.waPage || this.waPage.isClosed()) {
            const ctx = await initHeadlessBrowser();
            const pages = ctx.pages();
            this.waPage = pages.find(p => p.url().includes('web.whatsapp.com'));
            
            if (!this.waPage) {
                console.log("🚀 [WhatsApp RPA] Abrindo WhatsApp Web em background...");
                this.waPage = await ctx.newPage();
                await this.waPage.goto('https://web.whatsapp.com', { waitUntil: 'load', timeout: 60000 });
                // Aguarda logar
                await this.waPage.waitForSelector('#pane-side, canvas', { timeout: 15000 }).catch(() => {});
            }
        }
        return this.waPage;
    }

    async sendSingleMessage(number, message) {
        const page = await this.getPage();
        const cleanNum = number.replace(/\D/g, '');
        const finalNum = cleanNum.length <= 11 ? `55${cleanNum}` : cleanNum;
        
        const waUrl = `https://web.whatsapp.com/send?phone=${finalNum}&text=${encodeURIComponent(message)}`;
        await page.goto(waUrl);
        
        const sendBtnSelectors = [
            'span[data-icon="send"]',
            '[data-testid="compose-btn-send"]',
            'button:has(span[data-icon="send"])'
        ];
        
        const invalidNumberSelector = 'div[data-animate-modal-body="true"]:has-text("inválido")';
        const okButton = 'div[role="button"]:has-text("OK")';

        const resultStatus = await Promise.race([
            page.waitForSelector(sendBtnSelectors.join(','), { timeout: 30000 }).then(() => 'READY'),
            page.waitForSelector(invalidNumberSelector, { timeout: 30000 }).then(() => 'INVALID'),
            page.waitForSelector('div[contenteditable="true"]', { timeout: 30000 }).then(() => 'READY')
        ]).catch(() => 'TIMEOUT');

        if (resultStatus === 'INVALID') {
            try { await page.click(okButton, { timeout: 2000 }); } catch(e) {}
            return { success: false, reason: 'Número inválido' };
        }

        if (resultStatus === 'TIMEOUT') {
            return { success: false, reason: 'Timeout aguardando WhatsApp' };
        }

        const chatInput = 'div[contenteditable="true"]';
        try {
            await page.waitForSelector(chatInput, { timeout: 10000 });
            await page.click(chatInput);
            await page.waitForTimeout(500);
            
            await page.keyboard.type(' ');
            await page.keyboard.press('Backspace');
            await page.waitForTimeout(800);
            
            await page.keyboard.press('Enter');
            
            await page.waitForTimeout(1000);
            for (const selector of sendBtnSelectors) {
                const btn = page.locator(selector).first();
                if (await btn.count() > 0 && await btn.isVisible()) {
                    await btn.click({ force: true });
                }
            }

            await page.waitForTimeout(2000);
            return { success: true };
        } catch (e) {
            return { success: false, reason: e.message };
        }
    }

    async startBatch(contacts, message, minDelay = 2000, maxDelay = 10000) {
        if (this.status === 'RUNNING') return;
        
        this.queue = contacts.map(c => ({ ...c, status: 'pending' }));
        this.messageTemplate = message;
        this.progress = { total: contacts.length, sent: 0, errors: 0 };
        this.status = 'RUNNING';
        this.shouldStop = false;

        this.emit('status', this.getStatus());

        for (let i = 0; i < this.queue.length; i++) {
            if (this.shouldStop) {
                this.status = 'IDLE';
                break;
            }

            while (this.status === 'PAUSED') {
                if (this.shouldStop) break;
                await new Promise(r => setTimeout(r, 1000));
            }
            if (this.shouldStop) break;

            const contact = this.queue[i];
            if (contact.status === 'sent') continue;

            try {
                const res = await this.sendSingleMessage(contact.number, this.messageTemplate);
                if (res.success) {
                    contact.status = 'sent';
                    this.progress.sent++;
                } else {
                    contact.status = 'error';
                    contact.errorReason = res.reason;
                    this.progress.errors++;
                }
            } catch (err) {
                contact.status = 'error';
                contact.errorReason = err.message;
                this.progress.errors++;
            }

            this.emit('status', this.getStatus());

            if (i < this.queue.length - 1 && !this.shouldStop && this.status !== 'PAUSED') {
                const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
                await new Promise(r => setTimeout(r, delay));
            }
        }

        if (!this.shouldStop) {
            this.status = 'IDLE';
            this.emit('status', this.getStatus());
        }
    }

    pause() {
        if (this.status === 'RUNNING') {
            this.status = 'PAUSED';
            this.emit('status', this.getStatus());
        }
    }

    resume() {
        if (this.status === 'PAUSED') {
            this.status = 'RUNNING';
            this.emit('status', this.getStatus());
        }
    }

    cancel() {
        this.shouldStop = true;
        this.status = 'IDLE';
        this.emit('status', this.getStatus());
    }

    getStatus() {
        return {
            status: this.status,
            progress: this.progress,
            queue: this.queue
        };
    }
}

export const whatsappEngine = new WhatsAppEngine();
