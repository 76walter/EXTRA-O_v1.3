import fs from 'fs';
import path from 'path';
import { encryptText, decryptText } from './crypto.js';

const MASKS_FILE = path.join(process.cwd(), 'masks.json');
const SETTINGS_FILE = path.join(process.cwd(), 'settings.json');

let _masksCache = null;
let _settingsCache = null;

export const loadMasks = () => {
    if (_masksCache) return _masksCache;
    if (!fs.existsSync(MASKS_FILE)) {
        _masksCache = {};
        return _masksCache;
    }
    try {
        _masksCache = JSON.parse(fs.readFileSync(MASKS_FILE, 'utf-8'));
    } catch (e) {
        console.error('⚠️ Erro ao ler masks.json:', e.message);
        _masksCache = {};
    }
    return _masksCache;
};

export const saveMasks = (masks) => {
    _masksCache = masks;
    fs.writeFileSync(MASKS_FILE, JSON.stringify(masks, null, 2));
};

const SENSITIVE_FIELDS = ['vtmePass', 'timPass', 'dialerPass'];
const DEFAULT_SETTINGS = {
    vtmeUser: '',
    vtmePass: '',
    timUser: '',
    timPass: '',
    dialerUser: '',
    dialerPass: ''
};

export const loadSettings = () => {
    if (_settingsCache) return { ..._settingsCache };
    if (!fs.existsSync(SETTINGS_FILE)) {
        _settingsCache = { ...DEFAULT_SETTINGS };
        return { ..._settingsCache };
    }
    try {
        const raw = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
        const decrypted = { ...raw };
        SENSITIVE_FIELDS.forEach(field => {
            if (decrypted[field]) {
                decrypted[field] = decryptText(decrypted[field]);
            }
        });
        _settingsCache = decrypted;
        return { ..._settingsCache };
    } catch (e) {
        console.error('⚠️ Erro ao ler settings.json:', e.message);
        _settingsCache = { ...DEFAULT_SETTINGS };
        return { ..._settingsCache };
    }
};

export const saveSettings = (settings) => {
    const toSave = { ...settings };
    SENSITIVE_FIELDS.forEach(field => {
        if (toSave[field] && !toSave[field].startsWith('ENC:')) {
            toSave[field] = encryptText(toSave[field]);
        }
    });
    _settingsCache = null;
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(toSave, null, 2));
};
