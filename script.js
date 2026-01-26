const CONFIG = {
  WHATSAPP_PHONE_E164: "5511952516867",
  CITY: "Itaim Bibi, São Paulo – SP",
  ADDRESS: "Av. Brig. Faria Lima, 3900 - 7º andar - Itaim Bibi, São Paulo - SP",
  CTA_PRIMARY: "Solicitar agendamento",
  CTA_SECONDARY: "Falar por WhatsApp",

  /**
   * URL do Google Apps Script (Web App) que envia e-mail via Google Workspace.
   * Cole aqui a URL gerada em: Implantar → App da web.
   *
   * Exemplo: https://script.google.com/macros/s/AKfycb.../exec
   */
  FORM_ACTION_URL: "https://script.google.com/macros/s/AKfycby3yapzrTpuT_5e6aN-NGPAkn_N-hNwWwHQ-1D7pocqHlQ2DR-egslBCg_KcIyJlFlqag/exec",

  /**
   * Token simples anti-abuso (deve bater com o TOKEN no Apps Script).
   * Use um token forte (20–40 chars). Ex.: gerador de senhas.
   */
  FORM_TOKEN: "Adfifgjq3gnqiegnh0q#%!gwgmi4tg",

  // Cards exibidos na seção "Procedimentos em foco"
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

  // Opções do dropdown (campo opcional)
  INTEREST_OPTIONS: [
    "Mamoplastia de aumento",
    "Mastopexia",
    "Contratura capsular",
    "Revisão de cirurgia prévia",
    "Abdominoplastia / Lipoescultura",
    "Face",
    "Procedimentos",
    "Outros",
    "não informado",
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

const ensureHidden = (form, name, value) => {
  let input = form.querySelector(`input[name="${name}"]`);
  if (!input) {
    input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    form.appendChild(input);
  }
  input.value = value;
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

  form.addEventListener("submit", (event) => {
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

    // Campos extras para o Apps Script (envio por e-mail via Workspace)
    ensureHidden(form, "token", CONFIG.FORM_TOKEN || "");
    ensureHidden(form, "page_url", window.location.href);
    ensureHidden(form, "submitted_at", new Date().toISOString());
    ensureHidden(form, "redirect", "https://www.drantoniorolim.com.br/thank-you.html");

    // Honeypot simples (bots costumam preencher)
    ensureHidden(form, "website", "");

    // Submissão tradicional (evita CORS e aumenta confiabilidade)
    form.action = CONFIG.FORM_ACTION_URL;
    form.method = "POST";
    form.target = "_self";

    setStatus("Enviando…");
    if (submitBtn) submitBtn.disabled = true;

    form.submit();
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
