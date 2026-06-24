const fs = require('fs');

let content = fs.readFileSync('src-server/routes/legacy_routes.js', 'utf8');

const importStr = "import { timRPA } from '../rpa/tim.js';\nimport { vtmeRPA } from '../rpa/vtme.js';\nimport { tresCPlusRPA } from '../rpa/3cplus.js';";
content = content.replace(/import \{ timRPA \} from '\.\.\/rpa\/tim\.js';\r?\nimport \{ vtmeRPA \} from '\.\.\/rpa\/vtme\.js';/, importStr);

const startIdx = content.indexOf("app.get('/dial-3c', async (req, res) => {");
let endIdx = content.indexOf("res.status(500).json({ error: 'Falha ao buscar aba do 3C Plus' });");

if (endIdx !== -1) {
    endIdx = content.indexOf("});", endIdx) + 3;
}

if (startIdx !== -1 && endIdx !== -1) {
    const newRoute = `app.get('/dial-3c', async (req, res) => {
    const { number } = req.query;
    if (!number) return res.status(400).json({ error: 'Número não fornecido' });

    try {
        const result = await tresCPlusRPA.dial(number);
        res.json(result);
    } catch (error) {
        console.error('Erro na rota dial-3c:', error);
        res.status(500).json({ error: error.message || 'Erro interno na discagem' });
    }
});`;
    content = content.substring(0, startIdx) + newRoute + content.substring(endIdx);
    fs.writeFileSync('src-server/routes/legacy_routes.js', content, 'utf8');
    console.log('legacy_routes.js modificado com sucesso!');
} else {
    console.log('Não encontrou os índices. startIdx:', startIdx, 'endIdx:', endIdx);
}
