const CONFIG = {
  WHATSAPP_PHONE_E164: "5511952516867",
  CITY: "São Paulo – SP",
  CTA_PRIMARY: "Solicitar avaliação técnica",
  CTA_SECONDARY: "Falar no WhatsApp",
  FORM_ENDPOINT_URL: "FORM_ENDPOINT_URL",
  PROCEDURES: [
    {
      title: "Aumento de mama",
      description:
        "Indicação criteriosa, foco em segurança e previsibilidade para um resultado harmonioso.",
    },
    {
      title: "Mastopexia (com ou sem prótese)",
      description:
        "Levantamento e reestruturação com planejamento técnico, respeitando anatomia e objetivos.",
    },
    {
      title: "Revisão mamária",
      description:
        "Secondary breast surgery para corrigir insatisfações, contraturas ou ptose recidivada.",
    },
  ],
  PROCEDURE_SECONDARY: {
    title: "Explante",
    description:
      "quando aplicável, como prova de competência e responsabilidade técnica.",
  },
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

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Selecione um procedimento";
  placeholder.disabled = true;
  placeholder.selected = true;
  select.appendChild(placeholder);

  CONFIG.PROCEDURES.forEach((procedure) => {
    const option = document.createElement("option");
    option.value = procedure.title;
    option.textContent = procedure.title;
    select.appendChild(option);
  });

  const secondary = document.createElement("option");
  secondary.value = CONFIG.PROCEDURE_SECONDARY.title;
  secondary.textContent = `${CONFIG.PROCEDURE_SECONDARY.title} (quando aplicável)`;
  select.appendChild(secondary);
};

const initSecondaryProcedure = () => {
  const title = document.querySelector("[data-secondary-title]");
  const description = document.querySelector("[data-secondary-description]");
  if (!title || !description) return;
  title.textContent = CONFIG.PROCEDURE_SECONDARY.title;
  description.textContent = CONFIG.PROCEDURE_SECONDARY.description;
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
      interesse: form.interesse.value,
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

    if (!data.interesse) {
      form.interesse.setAttribute("aria-invalid", "true");
      setStatus("Selecione um procedimento.", true);
      return;
    }

    if (!data.consentimento) {
      form.consentimento.setAttribute("aria-invalid", "true");
      setStatus("É necessário concordar com a política de privacidade.", true);
      return;
    }

    const fallbackMessage = [
      "Olá, gostaria de solicitar avaliação técnica.",
      `Nome: ${data.nome}`,
      `WhatsApp: ${data.whatsapp}`,
      `Interesse: ${data.interesse}`,
      data.email ? `E-mail: ${data.email}` : null,
      data.mensagem ? `Mensagem: ${data.mensagem}` : null,
    ]
      .filter(Boolean)
      .join("\n");

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
  initSecondaryProcedure();
  initWhatsAppLinks();
  setupAccordion();
  setupReveal();
  setupForm();
});
