const CONFIG = {
  WHATSAPP_PHONE_E164: "5511952516867",
  CITY: "Itaim Bibi, São Paulo – SP",
  ADDRESS: "Av. Brig. Faria Lima, 3900 - 7º andar - Itaim Bibi, São Paulo - SP",
  CTA_PRIMARY: "Solicitar agendamento",
  CTA_SECONDARY: "Falar por WhatsApp",
  FORM_ENDPOINT_URL: "FORM_ENDPOINT_URL",
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

const openWhatsApp = (message, redirectUrl) => {
  const url = buildWhatsAppLink(message);
  const opened = window.open(url, "_blank");
  if (opened) {
    opened.opener = null;
  }
  if (!opened) {
    window.location.href = url;
    return;
  }
  if (redirectUrl) {
    window.location.href = redirectUrl;
  }
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

  // Campo opcional: "não informado" como padrão.
  select.innerHTML = "";

  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = "não informado";
  opt0.selected = true;
  select.appendChild(opt0);

  CONFIG.INTEREST_OPTIONS.forEach((label) => {
    // evita duplicar o "não informado" (já existe como opt0)
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
      if (panel) {
        panel.style.maxHeight = !expanded ? `${panel.scrollHeight}px` : "0";
      }
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

const setupForm = () => {
  const form = document.getElementById("lead-form");
  if (!form) return;
  const status = form.querySelector(".form-status");

  const setStatus = (message, isError = false) => {
    status.textContent = message;
    status.style.color = isError ? "#b34b3c" : "";
  };

  const resetStatus = () => setStatus("");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    resetStatus();

    const data = {
      nome: form.nome.value.trim(),
      whatsapp: form.whatsapp.value.trim(),
      email: form.email.value.trim(),
      // Campo opcional: pode vir vazio ("") = não informado
      interesse: (form.interesse && form.interesse.value) ? form.interesse.value : "",
      mensagem: form.mensagem.value.trim(),
      consentimento: form.consentimento.checked,
    };

    form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));

    if (!data.nome) {
      form.nome.setAttribute("aria-invalid", "true");
      setStatus("Informe seu nome.", true);
      return;
    }

    if (!data.whatsapp || !whatsappRegex.test(data.whatsapp)) {
      form.whatsapp.setAttribute("aria-invalid", "true");
      setStatus("Informe um WhatsApp válido.", true);
      return;
    }

    // interesse agora é opcional: sem validação obrigatória.

    if (!data.consentimento) {
      form.consentimento.setAttribute("aria-invalid", "true");
      setStatus("É necessário concordar com a política de privacidade.", true);
      return;
    }

    const fallbackLines = [
      `Olá, gostaria de ${CONFIG.CTA_PRIMARY.toLowerCase()}.`,
      `Nome: ${data.nome}`,
      `WhatsApp: ${data.whatsapp}`,
      data.interesse ? `Procedimento: ${data.interesse}` : null,
      data.email ? `E-mail: ${data.email}` : null,
      data.mensagem ? `Mensagem: ${data.mensagem}` : null,
    ].filter(Boolean);

    const fallbackMessage = fallbackLines.join("\n");

    const endpointReady =
      CONFIG.FORM_ENDPOINT_URL &&
      CONFIG.FORM_ENDPOINT_URL !== "FORM_ENDPOINT_URL";

    if (!endpointReady) {
      openWhatsApp(fallbackMessage, "thank-you.html");
      return;
    }

    try {
      const response = await fetch(CONFIG.FORM_ENDPOINT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Falha no envio");
      }

      window.location.href = "thank-you.html";
    } catch (error) {
      setStatus("Não foi possível enviar agora. Abrindo WhatsApp.", true);
      openWhatsApp(fallbackMessage);
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
