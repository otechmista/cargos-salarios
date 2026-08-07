# Cargos & Salários em TI — Brasil 2026

Página estática (HTML/CSS/JS puro, sem build) com uma tabela cruzada de cargos e salários de TI no Brasil, do estágio ao C-level, comparando regimes **CLT** e **PJ**, com faixas estimadas por estado/região.

Fontes: Robert Half (Guia Salarial 2026), Michael Page, Glassdoor Brasil, Nerdin, Código Fonte TV, salario.com.br, Aprender21 e HUNT IT — ver rodapé da própria página para os links.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub (pode ser público ou privado, desde que o plano permita Pages).
2. Suba estes arquivos para a raiz do repositório (ou para `/docs`, se preferir):
   - `index.html`
   - `og-image.svg`
3. No repositório: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, escolha a branch (`main`) e a pasta (`/root` ou `/docs`).
4. Aguarde alguns minutos — o GitHub publica em `https://SEU-USUARIO.github.io/SEU-REPOSITORIO/`.
5. Abra `index.html` e troque a tag `<meta property="og:url" content="...">` pela URL final, para o preview em redes sociais ficar correto.

## Comandos (a partir desta pasta)

```bash
git init
git add index.html og-image.svg README.md .gitignore
git commit -m "Publica tabela de cargos e salários de TI"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
git push -u origin main
```

## Compartilhamento em redes sociais

O `<head>` já inclui Open Graph e Twitter Card apontando para `og-image.svg`. A maioria das redes (X/Twitter, Discord, Slack, WhatsApp, Telegram, LinkedIn) renderiza SVG no preview; para garantir compatibilidade total com Facebook (que às vezes prefere raster), exporte `og-image.svg` para PNG 1200×630 em qualquer conversor e aponte as tags `og:image` / `twitter:image` para o `.png`.

## Atualizar os dados

Os cargos ficam no array `ROWS` dentro do `<script>` de `index.html`, no formato:

```js
["Cargo", "Área", "Nível", cltMin, cltMax, pjMin, pjMax, "Fonte"]
```

Os multiplicadores por estado ficam no array `REGIONS`, logo abaixo.
