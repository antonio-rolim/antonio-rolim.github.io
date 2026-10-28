# Site do Dr. Antônio Rolim

Fonte de produção: `antonio-rolim/antonio-rolim.github.io`, branch `main`, raiz.
O domínio canônico é `https://drantoniorolim.com.br/`. O repositório `antonio-rolim/page` não publica este site.
O GitHub Pages publica automaticamente os commits em `main`.

## Arquivos

- `index.html`: conteúdo, cards, credenciais, formulário e links nativos.
- `script.js`: contato, validação, status do envio, atribuição e eventos de interação.
- `analytics.js`: uma inicialização de GA4/Google Ads com URL de página sem query.
- `styles.css`: identidade visual e apresentação responsiva.
- `thank-you.html`: status do contato; não confirma recebimento por simples visita.
- `privacy.html`: descrição dos dados, serviços e ferramentas utilizados.
- `robots.txt` e `sitemap.xml`: descoberta das URLs canônicas.
- `tests/site.test.cjs`: testes locais sem enviar contatos a serviços externos.

## Validação

Requer Node.js 20 ou posterior, sem instalar dependências:

```bash
node --check script.js
node --check analytics.js
node --test tests/site.test.cjs
git diff --check
```

Confira desktop e celular, links de WhatsApp, formulário, status e política. Não envie dados reais de pacientes em testes.

## Configuração do contato

`CONFIG` em `script.js` mantém telefone, endereço e o endpoint Google Apps Script existente.
O token do formulário é público (está no cliente); não é senha nem controle de acesso.
O backend precisa validar os dados e limitar abuso independentemente desse valor.

O endpoint legado usa `FORM_RESPONSE_MODE: "no-cors"`. Uma resposta opaca não prova gravação: o site mostra contato ainda não confirmado e oferece WhatsApp. O POST não é repetido automaticamente.
A confirmação verificável exige a atualização do Apps Script descrita em `OPERATIONS.md`.

## Medição

- `whatsapp_click`: clique, com posição do CTA, sem procedimento nem URL da conversa.
- `form_submit_attempt`: tentativa validada de envio, não representa lead recebido.
- `form_submit_error`: falha de confirmação/transporte.
- `generate_lead` e uma conversão Google Ads: somente após recibo confirmado.

O contêiner GTM existente é mantido na página principal; estava vazio na auditoria.
Os eventos acima são implementados diretamente no código. Não os duplique no GTM.
Consulte `OPERATIONS.md` para backend, metas de Ads, checklist de publicação e rollback.
