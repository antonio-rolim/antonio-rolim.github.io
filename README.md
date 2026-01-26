# Landing Page — Dr. Antônio Rolim

Landing page estática para conversão de alta intenção, com foco em cirurgia mamária e contato via WhatsApp.

## Deploy rápido
1. Suba todos os arquivos para um servidor estático (FTP/NGINX) ou GitHub Pages.
2. Atualize o domínio em `index.html`, `sitemap.xml` e `robots.txt`.
3. Verifique se os links de WhatsApp e o formulário estão apontando para o destino correto.

## Configurações editáveis
Edite em `script.js`:
- `WHATSAPP_PHONE_E164`: telefone no formato E.164.
- `CTA_PRIMARY` e `CTA_SECONDARY`: textos dos CTAs.
- `CITY`: localidade exibida.
- `ADDRESS`: endereço completo usado no rodapé e no mapa.
- `FORM_ENDPOINT_URL`: URL do endpoint do formulário (placeholder por padrão).
- `PROCEDURES`: lista de procedimentos e descrições.

Outros pontos:
- `index.html`: meta tags (title, description, og, canonical).
- `sitemap.xml` e `robots.txt`: domínio final.

## Brand assets
- Hero/header: `assets/logo-hero.png` — versão dourada pensada para fundo escuro, com bom contraste no azul profundo.
- Footer: `assets/logo-footer.png` — versão para fundo claro, com tipografia azul e dourado mais discreto.
- Detalhe visual: `assets/icon.png` — usado como marca d'água sutil no hero.
- WhatsApp flutuante: `assets/wp.png` — ícone aplicado ao botão fixo no canto inferior direito.

## Formulário
- Se `FORM_ENDPOINT_URL` estiver vazio ou com o placeholder, o envio cai automaticamente no WhatsApp.
- O redirecionamento pós-envio vai para `thank-you.html`.

## Estrutura
- `index.html` — landing principal
- `styles.css` — estilos
- `script.js` — interações e configurações
- `thank-you.html` — página de agradecimento
- `privacy.html` — política de privacidade
- `assets/` — logos e ícone
- `robots.txt` e `sitemap.xml`
