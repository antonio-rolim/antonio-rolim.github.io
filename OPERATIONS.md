# Operação, confirmação de leads e rollback

## Snapshot anterior às correções

- Repositório: `antonio-rolim/antonio-rolim.github.io`.
- Branch de backup: `backup/pre-audit-fixes-2026-10-27`.
- Commit completo preservado: `9a01f3f1fb9813d7df1af8ab128fa09bf003f03a`.
- Snapshot inclui todos os arquivos e assets, não apenas a landing page.
- Foi gerado e verificado também um Git bundle completo durante a implementação.

Rollback recomendado: reverter o commit desta correção, preservando o histórico.

```bash
git fetch origin
git switch main
git pull --ff-only origin main
git log --oneline -5
# Substitua COMMIT_DA_CORRECAO pelo commit "fix: harden landing lead flow, tracking and SEO".
git revert --no-edit COMMIT_DA_CORRECAO
git push origin main
```

O revert gera uma nova publicação do Pages. Acompanhe o workflow `pages build and deployment`.
Como alternativa, baixe o ZIP da branch de backup. Evite `reset --hard`/force-push se houve outras alterações.

## Estado do endpoint externo

O código do Google Apps Script não está neste repositório. Nenhuma alteração foi feita no serviço externo ou nas configurações internas de Google Ads/Analytics/Meta.
O GET de diagnóstico retornou `Script function not found: doGet`; isso não testa nem invalida o `doPost` existente.
Não foram enviados leads reais em testes.

O modo legado continua fazendo um único POST com os campos anteriores, acrescidos de `request_id`, versão da política e atribuição estruturada. O telefone é normalizado para dígitos com país 55. Confira se o Apps Script salva esses campos extras; não presuma que ele já o faça.
Como não há leitura da resposta em `no-cors`, o retorno é **não confirmado**. Não é convertido automaticamente em lead no Google Ads.

## Contrato para ativar confirmação verificável

Antes de trocar `FORM_RESPONSE_MODE` para `cors`, acessar o projeto Apps Script existente e adaptar seu `doPost`, preservando a planilha, destinatários e regras operacionais atuais:

1. Validar nome, telefone completo com DDD, e-mail opcional, limites de tamanho, consentimento e honeypot no servidor. Não confiar no token público como segredo.
2. Ler o `request_id` (UUID) enviado. Se usar envio HTML sem JavaScript, gerar o ID no servidor quando ausente.
3. Usar trava/idempotência no servidor: o mesmo ID deve devolver o mesmo lead, sem gravar/enviar avisos novamente. A trava deve cobrir a verificação e a gravação.
4. Persistir o contato e a atribuição no destino já utilizado. Responder sucesso apenas depois da gravação. Não incluir campos pessoais no recibo.
5. Retornar JSON legível pelo navegador, inclusive após os redirecionamentos do ContentService. Verificar CORS no navegador real; não basta um POST do terminal.

Resposta exigida pelo site:

```json
{
  "ok": true,
  "persisted": true,
  "request_id": "o-mesmo-id-da-solicitacao",
  "lead_id": "identificador-opaco-unico-do-registro"
}
```

Fragmento de resposta para usar **após** a lógica de gravação existente (não substitui o backend):

```javascript
return ContentService.createTextOutput(JSON.stringify({
  ok: true,
  persisted: true,
  request_id: requestId,
  lead_id: String(leadId)
})).setMimeType(ContentService.MimeType.JSON);
```

A função de gravação, a validação e a idempotência precisam existir antes desse retorno. Teste também erro de permissão, indisponibilidade da planilha e repetição do mesmo ID. Se o Apps Script não permitir resposta CORS legível, será necessário um transporte com confirmação autenticada (por exemplo, um endpoint intermediário sob controle do consultório); não contorne o problema declarando sucesso em `no-cors`.

Depois de validar o contrato, mudar apenas `FORM_RESPONSE_MODE: "cors"`, testar com contato sintético autorizado e conferir o registro no destino antes de marcar a integração como concluída.

## Conversões

- A chamada duplicada `AW-18046419710/HgfDCJDikpMcEP6Fmp1D` foi retirada do agradecimento.
- A ação de formulário `AW-18046419710/EJBqCPzbjZIcEP6Fmp1D` só dispara após recibo confirmado.
- Usa `transaction_id` igual ao identificador opaco do lead. Uma marca na sessão evita repetição no reload; o mesmo ID permite deduplicação no Ads.
- Acesso direto, recibo ausente/vencido, transporte opaco e erro não geram conversão de lead.
- `whatsapp_click` mede somente clique: não comprova conversa recebida ou agendamento.
- O backend legado ainda não permite confirmação; portanto, até a integração acima, o formulário registra tentativa, mas não dispara conversão de lead. Isso é intencional para não otimizar campanhas por contatos não comprovados.

Na conta de Ads (fora deste repositório), revisar ações primárias/secundárias e metas da campanha. Evitar que `form_submit` automático, eventos importados e a ação de formulário contem o mesmo contato. Não importar `whatsapp_click` como consulta agendada.
No GA4, conferir DebugView e configurações de medição otimizada; o site usa links `wa.me` sem query para que cliques automáticos não capturem texto da conversa. Não incluir variáveis de campos do formulário nem procedimentos em tags GTM/Meta.

## Validação da publicação

- Testes: `node --test tests/site.test.cjs`.
- Workflow Pages concluído no SHA da alteração.
- Arquivos servidos pelo domínio devem coincidir com os blobs desse SHA.
- Canonical, Open Graph, schema, robots e sitemap usam o domínio sem `www`.
- Agradecimento tem `noindex` e não aparece no sitemap.
- Página principal funciona com JavaScript desativado: conteúdo visível, FAQ nativo, links WhatsApp nativos e formulário com POST, não GET.
- Inspecionar desktop e celular; garantir leitura, ausência de corte horizontal e CTAs acessíveis.
- Nenhuma alteração nas contas de Ads/GTM/Meta é inferida de uma atualização do código.
