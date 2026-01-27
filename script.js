const CONFIG = {
  WHATSAPP_PHONE_E164: "5511952516867",
  CITY: "Itaim Bibi, São Paulo – SP",
  ADDRESS: "Av. Brig. Faria Lima, 3900 - 7º andar - Itaim Bibi, São Paulo - SP",
  CTA_PRIMARY: "Realizar agendamento",
  CTA_SECONDARY: "Falar por WhatsApp",

  /**
   * URL do Google Apps Script (Web App) que envia e-mail via Workspace.
   * Ex.: https://script.google.com/macros/s/AKfycb.../exec
   */
  FORM_ACTION_URL: "https://script.google.com/macros/s/AKfycbw484jckQ_oG27Y8FdCLhSNg5DWTCBqjSr_EZSV6QVixHQ2-URykaELF-JydABjaURjAQ/exec",

  /**
   * Token forte (20–40 chars). Deve ser IGUAL ao TOKEN no Apps Script.
   */
  FORM_TOKEN: "Adfifgjq3gnqiegnh0q#%!gwgmi4tg",

  // Para redirecionar sem passar pelo Apps Script
  THANK_YOU_URL: "thank-you.html",

  PROCEDURES: [
    {
      title: "Mamoplastia de aumento",
      description:
        "Indicação individual e planejamento preciso para harmonia, segurança e previsibilidade.",
    },
    {
      title: "Mastopexia (com ou sem prótese)",
      description:
        "Levantamento e reestruturação com planejamento técnico e cuidado estético.",
    },
    {
      title: "Cirurgia mamária secundária (revisões)",
      description:
        "Para corrigir ou refinar aspectos insatisfatórios de cirurgias prévias, com critérios técnicos.",
    },
  ],

  INTEREST_OPTIONS: [
    "não informado",
    "Aumento de mama",
    "Mastopexia (com ou sem prótese)",
    "Revisão mamária / prótese / contratura",
    "Redução mamária",
    "Contorno corporal (lipo/abdominoplastia/braqui/cruro)",
    "Face (rinoplastia/otoplastia/ritidoplastia)",
    "Reconstrução / Oncocutânea",
    "Outros (inclui ninfoplastia)"
  ],
};

const whatsappRegex = /^(\+?55)?\s*(\(?\d{2}\)?)?\s*9?\d{4}[-\s]?\d{4}$/;

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
  grid.innerHTML = "";

  CONFIG.PROCEDURES.forEach((procedure) => {
    const card = document.createElement("article");
    card.className = "procedure-card reveal";
    card.innerHTML = `
      <h3>${procedure.title}</h3>
      <p>${procedure.description}</p>
      <a class="btn btn-ghost" data-whatsapp data-wa-message="${procedure.title}">Quero avaliar meu caso</a>
    `;
    grid.appendChild(card);
  });
};

const initProcedureSelect = () => {
  const select = document.getElementById("interesse");
  if (!select) return;

  select.innerHTML = "";

  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = "não informado";
  opt0.selected = true;
  select.appendChild(opt0);

  CONFIG.INTEREST_OPTIONS.forEach((label) => {
    if (label === "não informado") return;
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
    let message = `Olá, gostaria de ${CONFIG.CTA_PRIMARY.toLowerCase()}.`;
    const customMessage = link.getAttribute("data-wa-message");
    if (customMessage) {
      message = `Olá, gostaria de ${CONFIG.CTA_PRIMARY.toLowerCase()} sobre ${customMessage}.`;
    }
    link.setAttribute("href", buildWhatsAppLink(message));
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener");
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
  const elements = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    elements.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );

  elements.forEach((el) => observer.observe(el));
};

const tryCopyToClipboard = async (text) => {
  try {
    if (!navigator.clipboard) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

const buildPayload = (form) => {
  return {
    token: CONFIG.FORM_TOKEN || "",
    nome: form.nome.value.trim(),
    whatsapp: form.whatsapp.value.trim(),
    email: form.email.value.trim(),
    interesse: form.interesse && form.interesse.value ? form.interesse.value : "",
    mensagem: form.mensagem.value.trim(),
    consentimento: form.consentimento.checked ? "1" : "0",
    page_url: window.location.href,
    submitted_at: new Date().toISOString(),
    website: "", // honeypot (deve ficar vazio)
  };
};

const payloadToUrlEncoded = (payload) => {
  const params = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => params.append(k, v ?? ""));
  return params.toString();
};

const sendViaBeaconOrFetch = async (payload) => {
  const url = CONFIG.FORM_ACTION_URL;

  // 1) Tenta sendBeacon (fire-and-forget; bom para navegar em seguida)
  try {
    if (navigator.sendBeacon) {
      const body = payloadToUrlEncoded(payload);
      const blob = new Blob([body], { type: "application/x-www-form-urlencoded;charset=UTF-8" });
      const ok = navigator.sendBeacon(url, blob);
      if (ok) return true;
    }
  } catch {
    // ignora e tenta fetch
  }

  // 2) Fallback: fetch no-cors + keepalive (não lemos resposta; objetivo é entregar o POST)
  const body = payloadToUrlEncoded(payload);

  await fetch(url, {
    method: "POST",
    mode: "no-cors",
    keepalive: true,
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body,
  });

  return true;
};

const setupForm = () => {
  const form = document.getElementById("lead-form");
  if (!form) return;

  const status = form.querySelector(".form-status");
  const submitBtn = form.querySelector('button[type="submit"]');

  const setStatus = (message, isError = false) => {
    status.textContent = message;
    status.style.color = isError ? "#b34b3c" : "";
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nome = form.nome.value.trim();
    const whatsapp = form.whatsapp.value.trim();
    const consent = form.consentimento.checked;

    form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));

    if (!nome) {
      form.nome.setAttribute("aria-invalid", "true");
      setStatus("Informe seu nome.", true);
      return;
    }

    if (!whatsapp || !whatsappRegex.test(whatsapp)) {
      form.whatsapp.setAttribute("aria-invalid", "true");
      setStatus("Informe um WhatsApp válido.", true);
      return;
    }

    if (!consent) {
      form.consentimento.setAttribute("aria-invalid", "true");
      setStatus("É necessário concordar com a política de privacidade.", true);
      return;
    }

    if (!CONFIG.FORM_ACTION_URL || CONFIG.FORM_ACTION_URL === "FORM_ACTION_URL") {
      setStatus("Formulário indisponível no momento. Por favor, use o botão “Falar por WhatsApp”.", true);
      return;
    }

    if (!CONFIG.FORM_TOKEN) {
      setStatus("Formulário indisponível no momento. Por favor, use o botão “Falar por WhatsApp”.", true);
      return;
    }

    setStatus("Enviando…");
    if (submitBtn) submitBtn.disabled = true;

    const payload = buildPayload(form);

    try {
      await sendViaBeaconOrFetch(payload);

      // Mantém o usuário no seu domínio: redireciona diretamente para a sua thank-you.
      window.location.href = CONFIG.THANK_YOU_URL;
    } catch (err) {
      // Falha real (ex.: offline). Mostra fallback sem abrir WhatsApp.
      const fallbackLines = [
        `Solicitação de contato — ${CONFIG.CTA_PRIMARY}`,
        `Nome: ${payload.nome}`,
        `WhatsApp: ${payload.whatsapp}`,
        payload.interesse ? `Procedimento: ${payload.interesse}` : null,
        payload.email ? `E-mail: ${payload.email}` : null,
        payload.mensagem ? `Mensagem: ${payload.mensagem}` : null,
        `URL: ${payload.page_url}`,
        `Data/Hora: ${payload.submitted_at}`,
      ].filter(Boolean);

      const fallbackMessage = fallbackLines.join("\n");
      const copied = await tryCopyToClipboard(fallbackMessage);

      setStatus(
        copied
          ? "Não foi possível enviar agora. Copiamos os dados para a área de transferência."
          : "Não foi possível enviar agora. Por favor, tente novamente em instantes.",
        true
      );

      if (submitBtn) submitBtn.disabled = false;
    }
  });
};

document.addEventListener("DOMContentLoaded", () => {
  initConfigText();
  initProcedures();
  initProcedureSelect();
  initMapEmbed();
  initWhatsAppLinks();
  setupAccordion();
  setupReveal();
  setupForm();
});
