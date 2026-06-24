const { chromium } = require('playwright');

(async () => {
    try {
        const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
        const contexts = browser.contexts();
        let page = null;
        for (const context of contexts) {
            const pages = context.pages();
            for (const p of pages) {
                const url = p.url();
                if (url.includes('vtme2') || url.includes('orbit')) {
                    page = p;
                    break;
                }
            }
        }

        if (!page) {
            console.log("Página do VTME não encontrada.");
            process.exit(0);
        }

        const debugInfo = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('table tbody tr, .ui-grid-row'));
            if (rows.length === 0) return "Nenhuma linha encontrada.";

            const row = rows.find(r => r.innerText.match(/\d{3}\.\d{3}\.\d{3}\-\d{2}/));
            if (!row) return "Nenhuma linha com CPF encontrada.";

            const buttons = Array.from(row.querySelectorAll('button, a'));
            const btnHtmls = buttons.map(b => b.outerHTML);

            return {
                numRows: rows.length,
                cpfRow: row.innerText,
                buttons: btnHtmls
            };
        });

        console.log(JSON.stringify(debugInfo, null, 2));
        
        await browser.close();
    } catch (e) {
        console.error("Erro no teste:", e);
    }
})();
