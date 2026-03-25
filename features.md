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

## 6. Requisitos Não Funcionais (baseado em RULES.md)
- **Design:** Premium Aesthetics, Atomic Design, Tailwind CSS.
- **Testes:** TDD obrigatório (Testes unitários vitest/jest).
- **Qualidade de Código:** Princípios SOLID, arquivos com tamanho máximo de 300 linhas, separação de UI e lógica de negócio.
