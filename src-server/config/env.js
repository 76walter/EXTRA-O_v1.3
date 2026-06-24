import fs from 'fs';
import path from 'path';

const ENV_FILE = path.join(process.cwd(), '.env');
export const ENV = {
    PORT: 3001,
    VTME_URL: "https://vtme2.orbitsistemas.com.br/agstelecom_v2/index.html#/pedido/gerenciarPedido",
    TIM_URL: "https://apptimvendas.timbrasil.com.br/#/login",
    DIALER_URL: "https://agstelecom.3c.plus/",
    HEADLESS: false,
    TIMEOUT: 60000
};

if (fs.existsSync(ENV_FILE)) {
    try {
        const envContent = fs.readFileSync(ENV_FILE, 'utf-8');
        envContent.split('\n').forEach(line => {
            if (line.trim().startsWith('#')) return;
            const [key, ...val] = line.split('=');
            if (key && val.length > 0) {
                let value = val.join('=').trim();
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                if (value === 'true') value = true;
                else if (value === 'false') value = false;
                else if (!isNaN(Number(value)) && value !== '') value = Number(value);
                ENV[key.trim()] = value;
            }
        });
    } catch(e) {
        console.error("Erro ao carregar .env:", e.message);
    }
}

export const INTERNAL_API_KEY = Math.random().toString(36).substring(2) + Date.now().toString(36);

