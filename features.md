# ConcursosTI - Features Specification

## 1. Visão Geral
WebApp para organizar cronogramas de estudos para TI e outros assuntos, hospedado na Vercel e utilizando Firebase como backend/banco de dados.

## 2. Autenticação
- **Login Inicial:** Tela de login simples com credenciais fixas inicialmente (Usuário: `Hyrton`, Senha: `hyrtinho`).
- Estilização premium (wow factor), com cores harmoniosas e design intuitivo.

## 3. Navegação (Abas principais)
- **Dashboard:** Visão geral do progresso.
- **Editais:** Acompanhamento de editais.
- **Cadastros (Matérias e Conteúdos):** Gerenciamento das disciplinas.
- **Cronograma:** Planejamento semanal de estudos.

## 4. Módulo de Cadastros
- **Matérias (Subjects):** Cadastro de novas disciplinas (ex: Banco de Dados, Redes, Programação).
- **Conteúdos/Aulas:** Cadastro de tópicos vinculados a uma matéria específica.

## 5. Módulo de Cronograma
- **Seletor de Semana:** Componente de calendário para selecionar uma semana (iniciando na segunda-feira, ex: 23/03/2026).
- **Inclusão de Estudo:**
  - Seleção de Matéria.
  - Seleção de 1 ou mais Conteúdos da matéria selecionada.
  - Definição da quantidade de páginas por conteúdo.
- **Tabela de Cronograma:**
  - Colunas: `SEMANA` | `MATÉRIA` | `CONTEÚDO` | `NÚMERO DE PÁGINAS`

## 6. Registro de Estudo (Checkmark)
- Na aba de Cronograma, cada item deve possuir um checkbox para marcar como "Concluído".
- A conclusão deve disparar a lógica de revisões espaçadas.

## 7. Sistema de Revisões Espaçadas
- Ao concluir um estudo, gerar revisões automáticas para: +1d, +7d, +30d, +90d.
- Dashboard deve exibir uma seção "Revisar Hoje" com os conteúdos pendentes.

## 8. Modo Foco (Pomodoro)
- Timer integrado de 25/5 min.
- Opção de iniciar o timer vinculado a um item do cronograma para rastrear tempo real de estudo.

## 9. Aba Meu Material
- Repositório de links (PDFs, Vídeos) e anotações Markdown por conteúdo.

## 10. Aba Simulados
- Registro de notas de simulados.
- Gráfico de evolução de desempenho.

## 11. Aba Metas e Recompesas
- Contador de "Streaks" (dias consecutivos).
- Medalhas virtuais por marcos (ex: 500 páginas, 10 matérias concluídas).

## 12. Dashboard Avançado
- Gráfico de pizza (distribuição de tempo/matéria).
- Gráfico de barras (páginas lidas por dia).

## 13. Editais Compartilhados (Sincronização Global)
- Exibir cronômetro regressivo para a data da prova em cada edital ativo.
- **Sincronização:** Todas as adições, edições ou exclusões de editais são compartilhadas em tempo real entre todos os usuários da plataforma.

## 14. Integração com Anki (AnkiConnect)
- Exibição em tempo real da quantidade de flashcards com revisão pendente no dia atual.
- Conexão através da API REST exposta pelo AnkiConnect localmente.
- O Dashboard apresenta indicativos visuais unificados de Status da Conexão (Anki aberto/fechado).

## 15. Requisitos Não Funcionais (baseado em RULES.md)
- **Design:** Premium Aesthetics, Atomic Design, Tailwind CSS.
- **Testes:** TDD obrigatório (Testes unitários vitest/jest).
- **Qualidade de Código:** Princípios SOLID, arquivos com tamanho máximo de 300 linhas, separação de UI e lógica de negócio.
- **Zero-Build:** Uso de CDNs, sem bundlers.
## 16. Gestão de Usuários (Superadmin)
- **Superadmin:** Usuário `Hyrton` com senha `hyrtinho`.
- **Painel de Controle:** Aba exclusiva para o superadmin para gerenciar outros usuários.
- **Funcionalidades:**
  - Criar novos usuários (nome de usuário e senha).
  - Listagem de usuários existentes.
- **Isolamento de Dados:** Cada usuário possui seu próprio documento no Firestore (`users/{username}`), garantindo total privacidade para seus cronogramas, editais, matérias e estatísticas.
- **Migração:** O perfil `Hyrton` mantém todos os seus dados atuais de forma isolada.

## 17. Links Úteis
- Aba para centralizar links externos importantes (NotebookLM, Sites de busca, Editais, etc).
- Funcionalidades:
  - Adicionar link com título e URL.
  - Categorização simples ou listagem direta com ícones automáticos.
  - Exclusão de links.
