<!-- Teste GitHub Sync -->
# 🏥 Clinic for Life - Frontend

Bem-vindo ao repositório frontend do **Clinic for Life**, um sistema completo para gestão de alunos, acompanhamento de evolução física e ferramentas para personal trainers e clínicas de saúde/esporte.

Este projeto foi construído focando em alta performance, rotas tipadas e uma interface de usuário moderna e responsiva.

## 🚀 Tecnologias e Ferramentas

O projeto utiliza um ecossistema moderno baseado no ecossistema React:

- **Framework:** [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Roteamento:** [TanStack Router](https://tanstack.com/router/latest) (Roteamento 100% tipado baseado em arquivos)
- **Estilização:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Componentes:** [shadcn/ui](https://ui.shadcn.com/) (Construído sobre Radix UI para acessibilidade)
- **Ícones:** [Lucide React](https://lucide.dev/)
- **Validação e Formulários:** [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Gerenciamento de Estado e API:** Context API + [TanStack Query](https://tanstack.com/query/latest) / Fetch
- **Testes:** [Vitest](https://vitest.dev/) + React Testing Library

## 📂 Estrutura do Projeto

Abaixo está um resumo das pastas principais do projeto (`src/`) para ajudar na navegação:

```text
src/
├── assets/         # Arquivos estáticos e mídias do projeto (ex: imagens, logos)
├── components/     # Componentes reutilizáveis
│   ├── ui/         # Componentes base (botões, inputs, modais) gerados pelo shadcn/ui
│   └── ...         # Componentes específicos (AppSidebar, AppShell, ParceirosVitrine, etc.)
├── contexts/       # Contextos globais do React (ex: auth-context.tsx para Autenticação)
├── hooks/          # Hooks customizados do React (ex: use-mobile)
├── lib/            # Funções utilitárias e configurações globais
│   ├── api/        # Integração e comunicação com as rotas do Backend REST
│   └── utils.ts    # Utilitários de formatação e utilidades gerais
├── routes/         # Páginas da aplicação (TanStack Router)
└── test/           # Configurações de testes unitários (setup do Vitest)
```

## ⚙️ Pré-requisitos

Para rodar o projeto localmente, certifique-se de ter instalado:
- **Node.js** (Versão 18+ recomendada)
- **npm** (Opcionalmente você pode utilizar [Bun](https://bun.sh/))

## 🛠️ Como Executar Localmente

Siga os passos abaixo para configurar o ambiente de desenvolvimento:

1. **Acesse o repositório do frontend pelo terminal**
2. **Instale as dependências**
   Usando npm:
   ```bash
   npm install
   ```
   Ou usando Bun:
   ```bash
   bun install
   ```

3. **Variáveis de Ambiente**
   Faça uma cópia do arquivo de exemplo para o seu arquivo local e configure as variáveis (como a URL da API, se houver):
   ```bash
   cp .env.example .env
   ```

4. **Inicie o Servidor de Desenvolvimento**
   Usando npm:
   ```bash
   npm run dev
   ```
   Ou usando Bun:
   ```bash
   bun run dev
   ```

5. Acesse o sistema pelo navegador, no endereço: `http://localhost:5173`.

## 📜 Scripts Disponíveis

No terminal (`package.json`), você pode rodar os seguintes comandos:

- `npm run dev` - Inicia a aplicação em modo de desenvolvimento com Hot Module Replacement (HMR).
- `npm run build` - Gera os arquivos otimizados para produção na pasta `dist/`.
- `npm run preview` - Inicia um servidor local para testar a versão construída (`build`).
- `npm run lint` - Executa a análise estática no código usando o ESLint.
- `npm run format` - Formata automaticamente os arquivos do projeto usando o Prettier.
- `npm run test` - Executa a suíte de testes do Vitest no projeto.
- `npm run test:coverage` - Executa os testes e gera um relatório detalhado de cobertura de código.

## 🚢 Deploy

Produção não é publicada por push em `main` — é controlada por GitHub
Releases, com um workflow que valida o CI do commit e só então aciona o
Deploy Hook do Render. Ver [`docs/deploy.md`](docs/deploy.md) para o fluxo
completo, como publicar uma release e como fazer rollback.

## 👥 Principais Módulos da Aplicação
- **Autenticação:** Sistema de controle de acesso (Login) e perfil de usuário.
- **Dashboard:** Visão geral e atalhos rápidos do sistema para o personal ou clínica.
- **Gestão de Alunos:** Acompanhamento completo contendo:
  - Anamnese
  - Análise de Biomecânica
  - Evolução por fotos e gráficos
  - Relatório de Exames e Bioimpedância
  - Gestão de Treinos (Workouts)
- **Área de Parceiros:** Vitrine para exposição de parceiros da clínica.

---
Desenvolvido para transformar a gestão esportiva e clínica em uma experiência mais fluida. 🏥🏋️‍♂️
