---
description: 
---

📜 Padrões de Desenvolvimento e Workflow
⚠️ LEIA ANTES DE QUALQUER ALTERAÇÃO
Este documento define a arquitetura e as expectativas de qualidade para este projeto. O descumprimento destas regras pode gerar dívida técnica ou instabilidade.

🛠️ Passo 0 — Preparação Obrigatória
Contexto: Leia o arquivo RULES.md (se disponível) para entender as regras de negócio atuais.

Documentação: Revise este workflow (coding-standards.md) integralmente.

Mapeamento: Se a alteração envolver um módulo específico, analise a pasta js/controllers/ correspondente antes de codar.

Alinhamento: Se alguma regra técnica conflitar com uma necessidade urgente, consulte o usuário antes de desviar do padrão.

🧪 Passo 1 — Verificação e Testes (Prioritário)
Antes de testar visualmente no navegador:

Isolamento: A lógica de negócio deve residir em js/logic/ (funções puras e testáveis).

Testes Unitários: Execute os testes existentes (ex: node js/tests/[arquivo].test.js).

Validação: Não avance para a interface se os testes de lógica falharem.

Após garantir a lógica, verifique na UI:

[ ] Console do navegador livre de erros/warnings.

[ ] Renderização correta em diferentes tamanhos de tela.

[ ] Persistência de dados (API/Firebase) funcionando.

[ ] Dark mode e estados de hover consistentes.

🏁 Passo 2 — Finalização e Entrega
Comunicação: Relate claramente o que foi alterado.

Teste Manual do Usuário: Após finalizar, prepare o ambiente para o usuário. Se estiver em ambiente local, forneça o comando para abrir o navegador (No Windows, use: powershell -Command "Start-Process 'caminho_absoluto'").

Controle de Versão: NÃO realize commits ou pushes sem autorização explícita do usuário.

🏗️ Arquitetura Técnica
Zero-build: O projeto deve rodar diretamente via file:// ou servidor estático simples, sem necessidade de bundlers (Webpack/Vite) ou Node.js em runtime.

Dependências via CDN: Utilizar bibliotecas (Firebase, Tailwind, etc.) via links CDN, preferencialmente versões compatíveis com scripts globais.

Escopo Global Controlado: Funções e estados principais devem ser expostos via objeto window para comunicação entre scripts, mantendo a ordem de carregamento correta.

Ordem de Dependência: Core/Config → Data/Store → Controllers → App/Main.

🎨 Estilização e UI
Utility-first: Usar Tailwind CSS (via CDN) diretamente nas classes do HTML.

Design System: Utilizar variáveis CSS para cores e tokens (ex: var(--primary)).

Estética Moderna: Priorizar bordas arredondadas (rounded-xl), sombras leves (shadow-sm) e feedbacks táteis (hover:scale-105).

Manipulação de Visibilidade: Para alternar telas, prefira manipular style.display via JS em vez de apenas alternar classes de utilidade, para garantir prioridade de renderização.

🧠 Princípios de UX (Obrigatórios)
Regra dos 2 Segundos: A função de qualquer elemento deve ser óbvia instantaneamente.

Dados Explícitos: Evite esconder informações cruciais sob interações (como "show on hover"). Mostre o que é importante de imediato.

Feedback Visual: Toda ação (clique/envio) deve ter uma resposta visual (loader, transição ou toast).

Interface Limpa: Use modais ou seções expansíveis para evitar sobrecarga de informações em uma única tela.

Acessibilidade de Dados: Listagens com muitos itens devem obrigatoriamente incluir filtros ou campo de busca.

📂 Estrutura de Pastas Sugerida
projeto/
├── css/                # Estilos globais e variáveis
├── js/
│   ├── config/         # Inicialização de serviços (Firebase, APIs)
│   ├── data/           # Mockups e configurações estáticas
│   ├── logic/          # Lógica pura (processamento de dados)
│   ├── controllers/    # Manipulação da DOM e eventos
│   └── tests/          # Scripts de teste automatizado
├── modules/            # Funcionalidades ou páginas isoladas
│   └── [NomeModulo]/
│       ├── index.html
│       └── js/
└── index.html          # Ponto de entrada principal
💻 Princípios de Código
SOLID: Cada script deve ter uma responsabilidade única. Separe a lógica de cálculo da lógica de exibição.

Componentização Simples: Use o conceito de Atoms/Molecules mesmo em HTML puro, criando padrões reutilizáveis de botões e cards.

Segurança (Null Checks): Sempre valide a existência de um elemento no DOM antes de tentar manipulá-lo.

Código à Prova de Futuro: Desenvolva pensando que novos módulos serão adicionados. Use registros globais ou configurações centralizadas em vez de "hard-coding".

Template Literals: Ao construir HTML via JS, use concatenação simples se o código for manipulado por ferramentas de automação que possam conflitar com backticks (`).
