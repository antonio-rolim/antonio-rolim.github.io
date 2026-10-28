/**
 * Email-only contact receiver + read-only, non-personal receipt endpoint.
 * Generic repository copy: configure Script Properties CONTACT_DESTINATIONS
 * (comma-separated emails) and FORM_TOKEN. The private handoff is preconfigured.
 * No clinical/contact contents are stored in Script Properties or exposed by GET.
 */
const DESTINATION_EMAILS = (PropertiesService.getScriptProperties().getProperty("CONTACT_DESTINATIONS") || "").split(",").map(s => s.trim()).filter(Boolean);
const TOKEN = PropertiesService.getScriptProperties().getProperty("FORM_TOKEN") || "";
const RECEIPT_PREFIX = "ROLIM_RECEIPT_V1_";
const RECEIPT_TTL_MS = 48 * 60 * 60 * 1000;
const MAX_RECEIPTS = 500;
const PROTOCOL = "rolim-email-receipt-v1";

function doPost(e) {
  let lock;
  try {
    const p = extractParams_(e);
    if (!TOKEN || typeof p.token !== "string" || p.token !== TOKEN) return json_({ok: false, status: "invalid_request"});
    if (p.website && String(p.website).trim()) return json_({ok: false, status: "invalid_request"});
    if (!DESTINATION_EMAILS.length || DESTINATION_EMAILS.some(to => !validEmail_(to))) return json_({ok: false, status: "configuration_error"});
    const lead = validateLead_(p);
    // Missing IDs are supported for the native HTML fallback; not pollable by JS.
    const requestId = p.request_id || Utilities.getUuid();
    const receiptKey = p.receipt_key || Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
    if (!validId_(requestId) || !/^[a-f0-9]{64}$/.test(receiptKey)) return json_({ok: false, status: "invalid_request"});
    const keyHash = hash_(receiptKey);
    const digest = hash_(JSON.stringify([lead.nome, lead.whatsapp, lead.email, lead.interesse, lead.mensagem]));
    lock = LockService.getScriptLock();
    if (!lock.tryLock(5000)) return json_({ok: false, status: "busy"});
    const props = PropertiesService.getScriptProperties();
    const property = RECEIPT_PREFIX + requestId;
    const now = Date.now();
    let receipt = readReceipt_(props, requestId);
    if (receipt) {
      if (receipt.key_hash !== keyHash || receipt.payload_hash !== digest || now - receipt.created_at > RECEIPT_TTL_MS) return json_({ok: false, status: "invalid_request"});
      // An ambiguous send is never retried automatically: the provider may
      // already have accepted it. This avoids resending to a successful recipient.
      if (receipt.recipients.some(status => status === "sending" || status === "uncertain")) return json_(publicReceipt_(receipt));
      if (receipt.recipients.every(status => status === "accepted")) return json_(publicReceipt_(receipt));
      if (receipt.recipient_config !== hash_(DESTINATION_EMAILS.join(","))) return json_({ok: false, status: "configuration_error"});
    } else {
      cleanupReceipts_(props, now);
      const count = Object.keys(props.getProperties()).filter(k => k.indexOf(RECEIPT_PREFIX) === 0).length;
      if (count >= MAX_RECEIPTS) return json_({ok: false, status: "capacity_limit"});
      receipt = {
        request_id: requestId, lead_id: "lp-" + requestId, created_at: now,
        key_hash: keyHash, payload_hash: digest,
        recipient_config: hash_(DESTINATION_EMAILS.join(",")),
        recipients: DESTINATION_EMAILS.map(() => "pending")
      };
      // Persist intent before any email send. Storage failure aborts here.
      props.setProperty(property, JSON.stringify(receipt));
    }
    const subject = "[LP " + requestId.slice(0, 8) + "] Lead — " + lead.nome + " — " + (lead.interesse || "não informado");
    const lines = [
      "Nova solicitação pelo formulário da landing page", "",
      "Referência: " + receipt.lead_id,
      "Nome: " + lead.nome, "WhatsApp: " + lead.whatsapp,
      lead.email ? "E-mail: " + lead.email : null,
      "Procedimento: " + (lead.interesse || "não informado"),
      lead.mensagem ? "Mensagem: " + lead.mensagem : null,
      "Consentimento para contato: sim",
      "Versão da política: " + lead.privacy_version,
      "Página: " + lead.page_url,
      "Recebido no servidor: " + new Date(now).toISOString(),
      lead.submitted_at ? "Data informada pelo navegador: " + lead.submitted_at : null
    ];
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "gbraid", "wbraid", "fbclid"].forEach(k => {
      if (lead[k]) lines.push(k + ": " + lead[k]);
    });
    const body = lines.filter(line => line !== null).join("\n");
    const options = lead.email ? {replyTo: lead.email} : {};
    for (let i = 0; i < DESTINATION_EMAILS.length; i++) {
      if (receipt.recipients[i] === "accepted") continue;
      receipt.recipients[i] = "sending";
      props.setProperty(property, JSON.stringify(receipt));
      try {
        GmailApp.sendEmail(DESTINATION_EMAILS[i], subject, body, options);
      } catch (_) {
        receipt.recipients[i] = "uncertain";
        props.setProperty(property, JSON.stringify(receipt));
        return json_(publicReceipt_(receipt));
      }
      // A process interruption between Gmail and this write leaves "sending";
      // retries then remain unconfirmed instead of sending a duplicate email.
      receipt.recipients[i] = "accepted";
      props.setProperty(property, JSON.stringify(receipt));
    }
    return json_(publicReceipt_(receipt));
  } catch (_) {
    // No exception messages or patient contents in logs or responses.
    return json_({ok: false, status: "not_confirmed"});
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}

/** GET is read-only. Requires an unguessable per-request key, not the public form token. */
function doGet(e) {
  const p = e && e.parameter ? e.parameter : {};
  const callback = typeof p.callback === "string" && /^rolimReceipt_[a-f0-9]{24}$/.test(p.callback) ? p.callback : "";
  let result = {ok: false, status: "not_confirmed"};
  try {
    if (p.action === "receipt" && validId_(p.request_id) && typeof p.receipt_key === "string" && /^[a-f0-9]{64}$/.test(p.receipt_key)) {
      const receipt = readReceipt_(PropertiesService.getScriptProperties(), p.request_id);
      if (receipt && receipt.key_hash === hash_(p.receipt_key) && Date.now() - receipt.created_at <= RECEIPT_TTL_MS) result = publicReceipt_(receipt);
    }
  } catch (_) { /* Return non-personal failure only. */ }
  if (!callback) return json_(result);
  // Restricted callback identifier + JSON serialization prevent script injection.
  // The guard also makes a late response harmless after the browser timeout.
  return ContentService.createTextOutput('typeof ' + callback + ' === "function" && ' + callback + '(' + JSON.stringify(result) + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function publicReceipt_(receipt) {
  const accepted = receipt.recipients.length === DESTINATION_EMAILS.length && receipt.recipients.every(s => s === "accepted");
  return {
    protocol: PROTOCOL, ok: accepted, accepted: accepted,
    receipt_saved: true, notification_status: accepted ? "accepted" : "not_confirmed",
    request_id: receipt.request_id, lead_id: receipt.lead_id
  };
}

function readReceipt_(props, id) {
  const raw = props.getProperty(RECEIPT_PREFIX + id);
  return raw ? JSON.parse(raw) : null;
}

function cleanupReceipts_(props, now) {
  const all = props.getProperties();
  Object.keys(all).filter(k => k.indexOf(RECEIPT_PREFIX) === 0).forEach(k => {
    try { if (now - JSON.parse(all[k]).created_at > RECEIPT_TTL_MS) props.deleteProperty(k); } catch (_) { /* preserve malformed receipts for manual inspection */ }
  });
}

function validId_(value) { return typeof value === "string" && /^[a-zA-Z0-9-]{16,64}$/.test(value); }
function validEmail_(value) { return typeof value === "string" && value.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value); }
function hash_(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8).map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, "0")).join("");
}

function normalizePhone_(value) {
  if (/[^\d+()\s-]/.test(value) || (value.indexOf("+") >= 0 && !/^\+55/.test(value.trim()))) return "";
  let digits = value.replace(/\D/g, "");
  if ((digits.length === 12 || digits.length === 13) && digits.indexOf("55") === 0) digits = digits.slice(2);
  const ddds = "11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99".split(" ");
  if (ddds.indexOf(digits.slice(0, 2)) < 0 || !/^(?:[1-9]\d[2-5]\d{7}|[1-9]\d9\d{8})$/.test(digits) || /^(\d)\1+$/.test(digits.slice(2))) return "";
  return "55" + digits;
}

function bounded_(p, key, max) {
  if (p[key] === undefined || p[key] === null) return "";
  if (typeof p[key] !== "string" || p[key].length > max || /\u0000/.test(p[key])) throw new Error("invalid_request");
  return p[key].trim();
}

function validateLead_(p) {
  const lead = {
    nome: bounded_(p, "nome", 120), whatsapp: normalizePhone_(bounded_(p, "whatsapp", 20)),
    email: bounded_(p, "email", 254), interesse: bounded_(p, "interesse", 160),
    mensagem: bounded_(p, "mensagem", 1500), page_url: bounded_(p, "page_url", 250),
    privacy_version: bounded_(p, "privacy_version", 30), submitted_at: bounded_(p, "submitted_at", 60)
  };
  if (!lead.nome || /[\r\n]/.test(lead.nome + lead.interesse) || !lead.whatsapp || (lead.email && !validEmail_(lead.email)) || p.consentimento !== "1") throw new Error("invalid_request");
  // Only an origin/path is retained in the email; unrelated URLs are rejected.
  if (lead.page_url && !/^https:\/\/drantoniorolim\.com\.br(?:\/[^?#\s]*)?$/.test(lead.page_url)) throw new Error("invalid_request");
  if (!lead.page_url) lead.page_url = "https://drantoniorolim.com.br/";
  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "gbraid", "wbraid", "fbclid"].forEach(k => lead[k] = bounded_(p, k, 250));
  return lead;
}

function extractParams_(e) {
  const raw = e && e.postData && e.postData.contents ? String(e.postData.contents) : "";
  if (raw.length > 20000) throw new Error("invalid_request");
  if (e && e.parameter && Object.keys(e.parameter).length) return e.parameter;
  if (!raw.trim()) return {};
  if (raw.trim().charAt(0) === "{") {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) throw new Error("invalid_request");
    return obj;
  }
  const out = Object.create(null);
  raw.split("&").forEach(pair => {
    const idx = pair.indexOf("=");
    const k = decodeURIComponent((idx < 0 ? pair : pair.slice(0, idx)).replace(/\+/g, " "));
    const v = decodeURIComponent((idx < 0 ? "" : pair.slice(idx + 1)).replace(/\+/g, " "));
    out[k] = v;
  });
  return out;
}
function json_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
