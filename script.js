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

  // SEU Token (MANTIDO)
  FORM_TOKEN: "Adfifgjq3gnqiegnh0q#%!gwgmi4tg",

  // Página de sucesso
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
      setStatus(`Formulário indisponível no momento. Por favor, use o botão “${CONFIG.CTA_SECONDARY}”.`, true);
      return;
    }

    if (!CONFIG.FORM_TOKEN) {
      setStatus(`Formulário indisponível no momento. Por favor, use o botão “${CONFIG.CTA_SECONDARY}”.`, true);
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
