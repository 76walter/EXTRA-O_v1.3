# Guia de Hospedagem: Disponibilizar o Sistema para Outros Computadores

Este documento reúne as dúvidas e análises sobre a possibilidade de colocar o sistema de extração na web (nuvem) ou compartilhá-lo com outros colaboradores em diferentes máquinas.

---

## 1. É possível hospedar o sistema na Web/Nuvem pelo GitHub?

**Resposta rápida: Não diretamente pelo GitHub.**

O GitHub possui um recurso chamado *GitHub Pages*, mas ele é limitado a **páginas estáticas** (HTML, CSS e JavaScript simples do frontend). 
Como o nosso sistema é composto por 3 partes que interagem entre si, a hospedagem puramente na web exigiria o seguinte:
* **Frontend (React)**: Pode ser hospedado no GitHub Pages, Vercel ou Netlify.
* **Backend (Node.js/Express)**: Precisaria de um servidor de aplicação na nuvem (como Render, Railway, AWS ou Google Cloud).
* **Banco de Dados (MariaDB)**: Precisaria ser um banco de dados hospedado na nuvem (como Aiven, Clever Cloud, ou uma VPS contratada).

---

## 2. O Maior Impedimento: O Motor do Robô (Playwright / Edge)

Mesmo contratando servidores na nuvem para o backend e o banco de dados, colocar o sistema em um servidor web remoto traz problemas críticos de funcionamento para a automação:

1. **Ausência de Tela (Modo Headless)**:
   * Servidores na nuvem rodam em segundo plano e não possuem um monitor físico (interface de vídeo).
   * O robô precisaria rodar em modo invisível (*headless*). Isso impossibilita que você escaneie o QR Code do WhatsApp Web na tela do servidor ou resolva captchas manuais nos portais da TIM ou VTME.
2. **Bloqueio de IP por Segurança (Datacenters)**:
   * Portais como o **WhatsApp Web** e o **App TIM Vendas** possuem sistemas de segurança rigorosos.
   * IPs de servidores na nuvem (AWS, Render, Google Cloud) são facilmente identificados como robôs e bloqueados de imediato.
   * Rodar o robô localmente no seu computador (com o seu IP de internet comum) faz com que os acessos pareçam humanos e residenciais, evitando bloqueios.
3. **Controle Remoto de Navegador**:
   * O robô não conseguiria abrir abas do Edge diretamente na máquina física dos seus consultores para que eles façam login ou acompanhem a execução do robô.

---

## 3. A Solução Recomendada: Servidor Central Local (Rede Local / Intranet)

Se o objetivo é permitir que **outros notebooks ou computadores na mesma loja/escritório usem o sistema**, a melhor solução é transformar o seu computador em um **Servidor Central**:

### Como configurar e utilizar:

1. **Deixe o sistema rodando na sua máquina principal**:
   * Conecte o banco de dados e inicie com `npm run dev` na máquina principal.
2. **Descubra o IP Local da sua máquina principal**:
   * No teclado, pressione `Windows + R`, digite `cmd` e aperte Enter.
   * No prompt de comando, digite `ipconfig` e aperte Enter.
   * Procure pela sua placa de rede ativa (Wi-Fi ou Ethernet) e localize o **Endereço IPv4** (ex: `192.168.1.100`).
3. **Acesse a partir de outros computadores da loja**:
   * Garanta que os outros computadores estejam conectados na **mesma rede Wi-Fi ou cabo** que a máquina principal.
   * No navegador do notebook/PC secundário, digite o IP da máquina principal seguido da porta do Vite:
     ```text
     http://192.168.1.100:5173
     ```
     *(Substitua `192.168.1.100` pelo IP real da sua máquina principal)*.
4. **Pronto!**
   * Os outros consultores conseguirão realizar o login com os usuários que você cadastrar.
   * O banco de dados MariaDB centralizará as informações na sua máquina principal.
   * O robô rodará localmente na sua máquina central, permitindo que todos na loja usem o sistema ao mesmo tempo.

---

*Bom descanso! Quando voltar, sinta-se à vontade para tirar mais dúvidas ou iniciar os testes do sistema de login local.*
