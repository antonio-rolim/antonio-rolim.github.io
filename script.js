const CONFIG = {
  // Seus dados confirmados
  WHATSAPP_PHONE_E164: "5511952516867", 
  
  // Endereço atualizado (para garantir coerência nos e-mails do sistema)
  CITY: "Itaim Bibi, São Paulo – SP",
  ADDRESS: "Av. Brig. Faria Lima, 3900 - 7º andar - Itaim Bibi, São Paulo - SP",
  
  // Textos dos botões
  CTA_PRIMARY: "Agendar Consulta Médica",
  CTA_SECONDARY: "Falar com a equipe",
  
  // Mensagem padrão do WhatsApp (Mais elegante e direta)
  WHATSAPP_DEFAULT_MESSAGE:
    "Olá, vim pelo site e gostaria de informações sobre o agendamento de consulta com o Dr. Antônio Rolim.",

  // SUA URL do Google Apps Script (MANTIDA)
  FORM_ACTION_URL: "https://script.google.com/macros/s/AKfycbw484jckQ_oG27Y8FdCLhSNg5DWTCBqjSr_EZSV6QVixHQ2-URykaELF-JydABjaURjAQ/exec",

  // Identificador público do formulário; não é segredo nem substitui validação no servidor.
  FORM_TOKEN: "Adfifgjq3gnqiegnh0q#%!gwgmi4tg",

  // O endpoint legado retorna resposta opaca. Use "cors" apenas após validar
  // o contrato documentado em OPERATIONS.md; nunca repita o POST automaticamente.
  FORM_RESPONSE_MODE: "no-cors",

  // Página de status do envio
  THANK_YOU_URL: "thank-you.html",

  // A LISTA DE PROCEDIMENTOS (Alinhada com o Posicionamento High Ticket)
  PROCEDURES: [
    {
      title: "Mamoplastia de Aumento",
      description: "Planejamento bio-dimensional e recuperação assistida."
    },
    {
      title: "Mastopexia (Lifting Mamário)",
      description: "Reposicionamento dos tecidos com ou sem uso de implantes."
    },
    {
      title: "Cirurgia Secundária de Mama",
      description: "Correção de complexidades, troca de implantes e refinamentos."
    },
    {
      title: "Mamoplastia Redutora",
      description: "Redução de volume mamário com planejamento técnico individualizado."
    },
    {
      title: "Reconstrução Mamária",
      description: "Restauração da forma e simetria pós-mastectomia."
    },
    {
      title: "Explante de Silicone",
      description: "Remoção de implantes e reorganização tecidual."
    },
    {
      title: "Contorno Corporal (Lipo/Abdome)",
      description: "Lipoaspiração e Abdominoplastia com rigor técnico."
    },
    {
      title: "Outros Procedimentos",
      description: "Face, Pálpebras e Ninfoplastia."
    }
  ]
};

// DDD válido e número brasileiro completo; aceita +55 e formatação habitual.
const normalizeWhatsApp = (value) => {
  if (/[^\d+()\s-]/.test(value) || (value.includes("+") && !/^\+55/.test(value.trim()))) return null;
  let digits = value.replace(/\D/g, "");
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) digits = digits.slice(2);
  const ddds = new Set("11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99".split(" "));
  if (!ddds.has(digits.slice(0, 2))) return null;
  if (!/^(?:[1-9]\d[2-5]\d{7}|[1-9]\d9\d{8})$/.test(digits)) return null;
  if (/^(\d)\1+$/.test(digits.slice(2))) return null;
  return `55${digits}`;
};

const storage = {
  read(key, persistent = false) {
    try { return JSON.parse((persistent ? localStorage : sessionStorage).getItem(key)); } catch { return null; }
  },
  write(key, value, persistent = false) {
    try { (persistent ? localStorage : sessionStorage).setItem(key, JSON.stringify(value)); return true; } catch { return false; }
  },
};
const createRequestId = () => typeof crypto.randomUUID === "function" ? crypto.randomUUID() :
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (v) => v.toString(16).padStart(2, "0")).join("");
const track = (name, params = {}) => {
  // Allowlist only: no patient information, procedure, free text or WhatsApp URL.
  const safe = {};
  if (params.cta_position) safe.cta_position = params.cta_position;
  if (typeof window.gtag === "function") window.gtag("event", name, safe);
};
const getAttribution = () => {
  const params = new URLSearchParams(window.location.search);
  const campaign = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "gbraid", "wbraid", "fbclid"]) {
    const value = params.get(key);
    if (value) campaign[key] = value.slice(0, 250);
  }
  // Campaign details stay in this tab and go only to the contact endpoint.
  const first = storage.read("rolim_attribution");
  if (!first && Object.keys(campaign).length) storage.write("rolim_attribution", campaign);
  return { ...(first || {}), ...campaign };
};

const buildWhatsAppLink = (message) => {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${CONFIG.WHATSAPP_PHONE_E164}?text=${encoded}`;
};

const setTextContent = (selector, value) => {
  document.querySelectorAll(selector).forEach((el) => {
    el.textContent = value;
  });
};

const initConfigText = () => {
  setTextContent('[data-config="city"]', CONFIG.CITY);
  setTextContent('[data-config="address"]', CONFIG.ADDRESS);
  setTextContent('[data-cta="primary"]', CONFIG.CTA_PRIMARY);
  setTextContent('[data-cta="secondary"]', CONFIG.CTA_SECONDARY);
};

const initProcedures = () => {
  const grid = document.getElementById("procedures-grid");
  if (!grid) return;
  const existingCards = grid.querySelectorAll(".procedure-card");
  if (existingCards.length) {
    // Prefer content authored in HTML (editable via lpedit). Do not overwrite labels.
    return;
  }

  grid.innerHTML = "";

  CONFIG.PROCEDURES.forEach((procedure) => {
    const card = document.createElement("article");
    card.className = "procedure-card reveal";
    card.innerHTML = `
      <h3>${procedure.title}</h3>
      <p>${procedure.description}</p>
      <a class="btn btn-ghost" data-procedure-cta data-whatsapp data-wa-message="${procedure.title}">${CONFIG.CTA_PRIMARY}</a>
    `;
    grid.appendChild(card);
  });
};

const initProcedureSelect = () => {
  const select = document.getElementById("interesse");
  if (!select) return;

  if (select.options.length > 1) return;
  select.innerHTML = "";

  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = "não informado";
  opt0.selected = true;
  select.appendChild(opt0);

  const sourceOptions = Array.isArray(CONFIG.INTEREST_OPTIONS) && CONFIG.INTEREST_OPTIONS.length
    ? CONFIG.INTEREST_OPTIONS
    : [
        ...(Array.isArray(CONFIG.PROCEDURES) ? CONFIG.PROCEDURES.map((item) => item.title) : []),
        "Outros procedimentos",
      ];

  const uniqueOptions = Array.from(
    new Set(
      sourceOptions
        .filter((label) => label && label !== "não informado")
        .map((label) => label.trim())
    )
  );

  const normalizedMap = new Map();
  uniqueOptions.forEach((label) => {
    normalizedMap.set(label.toLowerCase(), label);
  });

  if (normalizedMap.has("outros procedimentos")) {
    normalizedMap.set("outros procedimentos", "Outros procedimentos");
  }

  Array.from(normalizedMap.values()).forEach((label) => {
    const option = document.createElement("option");
    option.value = label;
    option.textContent = label;
    select.appendChild(option);
  });
};

const initMapEmbed = () => {
  const iframe = document.querySelector("[data-map]");
  if (!iframe) return;
  const query = encodeURIComponent(CONFIG.ADDRESS);
  iframe.src = `https://www.google.com/maps?q=${query}&output=embed`;
};

const initWhatsAppLinks = () => {
  document.querySelectorAll("[data-whatsapp]").forEach((link) => {
    let message =
      CONFIG.WHATSAPP_DEFAULT_MESSAGE ||
      `Olá, vim pelo site e gostaria de ${CONFIG.CTA_PRIMARY.toLowerCase()}.`;
    const customMessage = link.getAttribute("data-wa-message");
    if (customMessage) {
      message = `Olá, vim pelo site e gostaria de agendar uma consulta médica sobre ${customMessage} com o Dr. Antônio Rolim.`;
    }
    link.setAttribute("href", `https://wa.me/${CONFIG.WHATSAPP_PHONE_E164}`);
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener noreferrer");
    link.addEventListener("click", (event) => {
      track("whatsapp_click", { cta_position: link.getAttribute("data-cta-position") || "other" });
      // Keep link_url free of text/procedure data for automatic outbound tracking.
      // Modified clicks retain a working, clean native WhatsApp link.
      if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        window.location.assign(buildWhatsAppLink(message));
      }
    });
  });
};

const setupAccordion = () => {
  document.querySelectorAll(".faq-trigger").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const expanded = trigger.getAttribute("aria-expanded") === "true";
      const panel = document.getElementById(trigger.getAttribute("aria-controls"));
      trigger.setAttribute("aria-expanded", String(!expanded));
      if (panel) panel.style.maxHeight = !expanded ? `${panel.scrollHeight}px` : "0";
    });
  });
};

const setupReveal = () => {
  // Content is visible by default, including if this enhancement fails.
  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let observer;
  try {
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    document.querySelectorAll(".reveal").forEach((el) => {
      el.classList.add("reveal-enhanced");
      observer.observe(el);
    });
  } catch {
    document.querySelectorAll(".reveal-enhanced").forEach((el) => el.classList.remove("reveal-enhanced"));
    if (observer) observer.disconnect();
  }
};

const buildPayload = (form, requestId) => ({
  token: CONFIG.FORM_TOKEN || "",
  request_id: requestId,
  nome: form.nome.value.trim(),
  whatsapp: normalizeWhatsApp(form.whatsapp.value.trim()),
  email: form.email.value.trim(),
  interesse: form.interesse.value || "",
  mensagem: form.mensagem.value.trim(),
  consentimento: form.consentimento.checked ? "1" : "0",
  privacy_version: "2026-10-27",
  page_url: `${window.location.origin}${window.location.pathname}`,
  submitted_at: new Date().toISOString(),
  website: form.querySelector('[name="website"]').value,
  ...getAttribution(),
});

const sendLead = async (payload) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    // One POST per attempt. A CORS/timeout failure can occur after persistence;
    // never silently retry through a second transport.
    const response = await fetch(CONFIG.FORM_ACTION_URL, {
      method: "POST", mode: CONFIG.FORM_RESPONSE_MODE,
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: new URLSearchParams(payload).toString(), signal: controller.signal,
    });
    if (response.type === "opaque") return { status: "unconfirmed" };
    if (!response.ok) throw new Error("delivery_unconfirmed");
    const result = await response.json();
    if (result.ok !== true || result.persisted !== true || result.request_id !== payload.request_id ||
        typeof result.lead_id !== "string" || !result.lead_id || result.lead_id.length > 128) {
      throw new Error("delivery_unconfirmed");
    }
    return { status: "confirmed", lead_id: result.lead_id };
  } finally { clearTimeout(timer); }
};

const setupForm = () => {
  const form = document.getElementById("lead-form");
  if (!form) return;
  form.noValidate = true; // Custom accessible errors; native validation remains available without JS.
  const status = form.querySelector(".form-status");
  const submitBtn = form.querySelector('button[type="submit"]');
  let submitting = false;
  let requestId = null;
  const showStatus = (message, error = false) => {
    status.textContent = message;
    status.style.color = error ? "#9d392c" : "";
  };
  const invalid = (field, message) => {
    field.setAttribute("aria-invalid", "true");
    field.setAttribute("aria-describedby", "form-status");
    const details = field.closest("details");
    if (details) details.open = true;
    field.focus();
    showStatus(message, true);
  };
  form.addEventListener("input", () => { if (!submitting) requestId = null; });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting) return;
    form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
    if (form.querySelector('[name="website"]').value) { showStatus("Não foi possível enviar. Fale com a equipe pelo WhatsApp.", true); return; }
    if (!form.nome.value.trim()) return invalid(form.nome, "Informe seu nome.");
    if (!normalizeWhatsApp(form.whatsapp.value.trim())) return invalid(form.whatsapp, "Informe um WhatsApp completo, incluindo o DDD.");
    if (form.email.value.trim() && !form.email.validity.valid) return invalid(form.email, "Confira o endereço de e-mail informado.");
    if (!form.consentimento.checked) return invalid(form.consentimento, "É necessário ler e concordar com a política de privacidade.");
    if (!CONFIG.FORM_ACTION_URL || !CONFIG.FORM_TOKEN) { showStatus("Formulário indisponível. Fale com a equipe pelo WhatsApp.", true); return; }
    submitting = true;
    submitBtn.disabled = true;
    form.setAttribute("aria-busy", "true");
    showStatus("Enviando sua solicitação…");
    requestId = requestId || createRequestId();
    const payload = buildPayload(form, requestId);
    track("form_submit_attempt");
    try {
      const result = await sendLead(payload);
      const receipt = { ...result, request_id: requestId, submitted_at: Date.now() };
      // Store receipt metadata only; never store name, contact details or history.
      if (storage.write("rolim_submission", receipt)) {
        window.location.assign(CONFIG.THANK_YOU_URL);
      } else {
        showStatus(result.status === "confirmed" ? "Solicitação recebida. A equipe entrará em contato." :
          "Sua solicitação foi enviada, mas o recebimento ainda não foi confirmado. Confirme com a equipe pelo WhatsApp abaixo.");
      }
    } catch {
      showStatus("Não foi possível confirmar o recebimento. Para evitar um envio duplicado, confirme com a equipe pelo WhatsApp abaixo.", true);
      track("form_submit_error");
    } finally {
      submitting = false;
      submitBtn.disabled = false;
      form.removeAttribute("aria-busy");
    }
  });
};

const setupSubmissionStatus = () => {
  const heading = document.querySelector("[data-submission-heading]");
  if (!heading) return;
  const text = document.querySelector("[data-submission-text]");
  const receipt = storage.read("rolim_submission");
  if (!receipt || !Number.isFinite(receipt.submitted_at) || Date.now() - receipt.submitted_at > 30 * 60 * 1000 ||
      receipt.submitted_at > Date.now() || typeof receipt.request_id !== "string") return;
  if (receipt.status !== "confirmed") {
    heading.textContent = "Confirme sua solicitação";
    text.textContent = "Sua solicitação foi enviada, mas o recebimento ainda não foi confirmado. Fale com a equipe pelo WhatsApp para confirmar seu contato.";
    return;
  }
  if (typeof receipt.lead_id !== "string" || !receipt.lead_id || receipt.lead_id.length > 128) return;
  heading.textContent = "Solicitação recebida";
  text.textContent = "Seu contato foi registrado. A equipe entrará em contato via WhatsApp para organizar o agendamento.";
  const marker = `rolim_conversion_${receipt.request_id}`;
  if (storage.read(marker) || typeof window.gtag !== "function") return;
  // Reserve before dispatch: fail closed if storage is unavailable.
  if (!storage.write(marker, true)) return;
  track("generate_lead");
  window.gtag("event", "conversion", {
    send_to: "AW-18046419710/EJBqCPzbjZIcEP6Fmp1D",
    transaction_id: receipt.lead_id,
  });
};

document.addEventListener("DOMContentLoaded", () => {
  getAttribution();
  initConfigText();
  initProcedures();
  initProcedureSelect();
  initMapEmbed();
  initWhatsAppLinks();
  setupAccordion();
  setupReveal();
  setupForm();
  setupSubmissionStatus();
});
