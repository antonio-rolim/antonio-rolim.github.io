# Operação, recibos de e-mail e rollback

## Snapshots preservados

- Antes da auditoria: branch `backup/pre-audit-fixes-2026-10-27`, commit `9a01f3f1fb9813d7df1af8ab128fa09bf003f03a`.
- Antes dos recibos de e-mail: branch `backup/pre-email-receipts-2026-10-27`, commit `f9e3832aa41398f16e3c4bad7cada80f999e920c`.
- Fonte publicada: `antonio-rolim/antonio-rolim.github.io`, branch `main`, raiz.
- O snapshot Git preserva todos os arquivos e assets. O código Apps Script original foi incluído no pacote privado de instalação.

Para desfazer uma correção mantendo o histórico:

```bash
git fetch origin
git switch main
git pull --ff-only origin main
git log --oneline -5
git revert --no-edit COMMIT_DA_CORRECAO
git push origin main
```

Acompanhar o workflow `pages build and deployment`. Não usar force-push se existirem alterações posteriores.

## O que o Apps Script realmente faz

O código original fornecido envia notificações para dois destinatários via `GmailApp.sendEmail`; não grava contatos em uma planilha.
O novo recibo confirma que as duas chamadas ao Gmail terminaram sem erro e que um recibo técnico foi salvo. Isso não comprova entrega na caixa de entrada ou leitura. A interface usa “solicitação encaminhada”.
Apenas metadados técnicos são guardados em Script Properties: identificador, horário, hashes e estado de cada envio. Nome, telefone, mensagem e conteúdo do e-mail não são gravados nesse recibo nem retornados por GET.

## Instalação do serviço externo (manual)

O acesso ao GitHub não fornece acesso ao editor do Apps Script. O backend não é publicado pelo GitHub Pages.

1. No projeto Apps Script que atende à URL `CONFIG.FORM_ACTION_URL`, guardar uma cópia do `Code.gs` atual.
2. Substituir seu conteúdo pelo `Code.gs` **pré-configurado do pacote privado**. Esse arquivo mantém os destinatários e o token fornecidos.
3. Salvar e entrar em **Implantar → Gerenciar implantações**.
4. Editar a implantação existente, selecionar **Nova versão** e implantar. Manter a mesma URL e as configurações de execução/acesso existentes. Apenas salvar o editor não atualiza a versão `/exec` usada pelo site.
5. Avisar que a implantação foi atualizada. Um teste real deve conferir os dois e-mails recebidos; os testes locais usam Gmail simulado e não enviam mensagens.

O arquivo `integrations/apps-script/Code.gs` deste repositório é um modelo sem os destinatários pessoais: ele lê Script Properties `CONTACT_DESTINATIONS` (e-mails separados por vírgula) e `FORM_TOKEN`. Não usar esse modelo sem configurar essas propriedades. A versão privada já contém a configuração e não exige esse passo.

## Transporte e proteção contra repetição

- O site gera `request_id` e uma `receipt_key` exclusiva aleatória de 256 bits.
- Faz um único POST com dados do contato, consentimento e atribuição. Nunca repete o POST para contornar CORS.
- Depois consulta o recibo por GET/JSONP com identificador, chave e callback restrito. Essa consulta é somente leitura e não contém dados da paciente.
- O Apps Script compara o hash da chave, restringe o nome do callback e retorna apenas o estado técnico.
- Se o serviço ainda for o antigo (sem `doGet`), o script de leitura for bloqueado, a resposta divergir ou houver timeout, o contato continua não confirmado e o site oferece WhatsApp.
- Uma trava serializa verificação e envio. O mesmo identificador, chave e conteúdo reaproveitam o recibo existente.
- Cada destinatário tem estado persistido antes e depois da chamada ao Gmail. Se um envio for ambíguo, ele não é repetido automaticamente; pode já ter sido aceito pelo provedor.
- Falha no segundo endereço não reenvia a mensagem ao primeiro. Uma interrupção entre Gmail e gravação do resultado mantém status não confirmado, exigindo conferência manual.
- Recibos são válidos por 48 horas. Entradas vencidas são removidas quando ocorre um novo POST. A proteção contra repetição não é um histórico permanente.
- Há limite de 500 recibos temporários. Falhas de quota, capacidade ou permissões não são transformadas em sucesso.
- O token presente no navegador é público: não substitui proteção contra abuso, cotas e validação no servidor.

## Contrato do recibo

```json
{
  "protocol": "rolim-email-receipt-v1",
  "ok": true,
  "accepted": true,
  "receipt_saved": true,
  "notification_status": "accepted",
  "request_id": "o-mesmo-id-do-post",
  "lead_id": "lp-identificador-opaco"
}
```

O site só confirma quando todos os campos satisfazem o contrato e o identificador corresponde ao POST. Um `OK` textual, resposta opaca ou HTTP 200 isolado não confirmam o contato.
A chave da consulta não é enviada aos eventos de medição nem guardada no recibo de sessão do navegador. O servidor armazena somente o hash dessa chave.

## Conversões

- `whatsapp_click` = clique, não conversa recebida ou agendamento.
- `form_submit_attempt` = tentativa validada, não recebimento.
- `form_submit_error` = falha de transporte/confirmação.
- `generate_lead` e `AW-18046419710/EJBqCPzbjZIcEP6Fmp1D` = somente recibo de e-mail aceito.
- Uma marca na sessão evita repetição no reload e o `transaction_id` opaco permite deduplicação no Ads.
- A ação duplicada `AW-18046419710/HgfDCJDikpMcEP6Fmp1D` continua removida.
- Acesso direto, recibo ausente/vencido, retorno parcial e falha não geram conversão de lead.
- Revisar na conta Ads as metas primárias/secundárias e as importações de eventos para não contar o mesmo contato duas vezes. Essa configuração não é alterada por commits no GitHub.
- O GTM mantido na página principal estava vazio na auditoria. Os eventos são implementados diretamente no código; não duplicá-los no contêiner.

## Validação

```bash
node --check script.js
node --check analytics.js
node --check < integrations/apps-script/Code.gs
node --test tests/*.test.cjs
git diff --check
```

Os testes do backend simulam Gmail, propriedades e trava: não usam credenciais e não enviam e-mails. Incluem falha parcial, interrupção após envio, chave errada, reenvio, callback malicioso e validação dos campos.
Depois da publicação, conferir o SHA do Pages, arquivos servidos, formulário, cards, política, status e ausência de conversão em acesso direto ao agradecimento.
