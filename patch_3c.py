import sys, re

with open('src-server/routes/legacy_routes.js', 'r', encoding='utf-8') as f:
    content = f.read()

import_str = "import { timRPA } from '../rpa/tim.js';\nimport { vtmeRPA } from '../rpa/vtme.js';\nimport { tresCPlusRPA } from '../rpa/3cplus.js';"
content = re.sub(r"import \{ timRPA \} from '\.\.\/rpa\/tim\.js';\r?\nimport \{ vtmeRPA \} from '\.\.\/rpa\/vtme\.js';", import_str, content)

start_marker = "app.get('/dial-3c', async (req, res) => {"
end_marker = "});\n    } catch (error) {\n        console.error(\"Erro geral 3C:\", error);\n        res.status(500).json({ error: 'Falha ao buscar aba do 3C Plus' });\n    }\n});"
# Try using string search
start_idx = content.find(start_marker)
end_idx = content.find("res.status(500).json({ error: 'Falha ao buscar aba do 3C Plus' });")
if end_idx != -1:
    end_idx = content.find("});", end_idx) + 3

if start_idx != -1 and end_idx != -1:
    new_route = """app.get('/dial-3c', async (req, res) => {
    const { number } = req.query;
    if (!number) return res.status(400).json({ error: 'Número não fornecido' });

    try {
        const result = await tresCPlusRPA.dial(number);
        res.json(result);
    } catch (error) {
        console.error('Erro na rota dial-3c:', error);
        res.status(500).json({ error: error.message || 'Erro interno na discagem' });
    }
});"""
    content = content[:start_idx] + new_route + content[end_idx:]
    with open('src-server/routes/legacy_routes.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print('legacy_routes.js modificado com sucesso!')
else:
    print('Não encontrou os índices. start_idx:', start_idx, 'end_idx:', end_idx)
