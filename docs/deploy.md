# Deploy em produção

O Render **não** faz mais deploy automático a cada push em `main`. Produção é
controlada por **GitHub Releases**: publicar uma release é o único passo
manual do processo inteiro — tudo depois disso é automático.

```
PR → main (CI roda)
  ↓
gh release create vX.Y.Z --generate-notes   ← único passo manual
  ↓
.github/workflows/release.yml
  ├── resolve   → descobre a tag/commit da release
  ├── validate  → confere que os checks de CI daquele commit estão verdes
  ├── deploy    → chama o Render Deploy Hook
  └── smoke     → espera a app responder e roda os smoke tests
```

Se `validate` falhar (commit sem todos os checks verdes), nada é publicado.
Se `smoke` falhar depois do deploy, o workflow fica vermelho como alerta —
não desfaz o deploy sozinho (ver "Rollback" abaixo).

## Como publicar uma release

```bash
gh release create v1.2.0 --generate-notes   # GitHub já sugere a próxima versão e monta o changelog
```

Ou pela UI: **Releases → Draft a new release**. Versionamento é
[SemVer](https://semver.org/) (`vMAJOR.MINOR.PATCH`).

## Rollback

Redisparar o mesmo workflow apontando para uma release anterior — sem revert
manual no Render:

```bash
gh workflow run release.yml -f tag=v1.1.0
```

## Secrets necessários (Settings → Secrets and variables → Actions)

| Secret               | Uso                                                              |
|-----------------------|-------------------------------------------------------------------|
| `RENDER_DEPLOY_HOOK`  | URL do Deploy Hook do serviço no Render (Settings → Deploy Hook). |
| `SMOKE_BASE_URL`      | URL pública de produção (ex.: `https://app.clinicforlife.com.br`). |
| `SMOKE_EMAIL`         | E-mail de uma conta real de produção, dedicada a smoke test.      |
| `SMOKE_PASSWORD`      | Senha dessa conta.                                                |

No Render: **Settings → Auto-Deploy → Off** (o deploy passa a ser só via
Deploy Hook, chamado pelo workflow).

## Limitações conhecidas

- **Sem branch protection nativa na `main`** — os repositórios são privados
  no plano free do GitHub, que não libera "required status checks" nem
  bloqueio de push direto (só disponível com GitHub Pro ou repositório
  público). Push direto continua bloqueado só por convenção (ver
  `CLAUDE.md`, seção "Controle de versão"). Isso não enfraquece a garantia de
  produção: o job `validate` confere o CI do commit exato antes de qualquer
  deploy, então mesmo um push direto "ruim" só chegaria em produção se
  alguém publicasse uma release em cima dele.
- **O Deploy Hook não recebe um commit específico** — ele publica o que
  estiver no topo de `main` no momento da chamada, não necessariamente o
  commit validado (janela de corrida pequena, já que deploys são sob demanda,
  não contínuos). Para eliminar isso por completo, dá pra trocar pela API do
  Render (`POST /v1/services/:id/deploys` com `commitId`), que custa ter uma
  API key do Render como secret a mais — não implementado ainda.
- **Rollback não é automático** — uma falha em `smoke` só alerta; redeploy de
  uma versão anterior é manual (`gh workflow run release.yml -f tag=...`).
