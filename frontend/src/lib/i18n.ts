export type SupportedLanguage = "en" | "es";

const clientCopy = {
  en: {
    portfolioPhaseBadge: "Closing Day live portal",
    welcome: "Welcome",
    portfolioDescription:
      "Your documents, summaries, and live updates are ready. Closing Day keeps every AI explanation transparent and lets you pause the helper layer at any time.",
    accessModeLabel: "Access Mode",
    accessMagicLink: "Magic link",
    accessPassword: "Email + password",
    languageLabel: "Language",
    savedProgressLabel: "Saved Progress",
    passwordSet: "Password set",
    magicLinkOnly: "Magic-link only",
    transactionsHeading: "Your active transactions",
    documentCountLabel: "seeded documents",
    priceLabel: "Price",
    expectedCloseLabel: "Expected close",
    closedOnLabel: "Closed on",
    openDocuments: "Open documents",
    backToStatus: "Back to system status",
    loadingPortfolio: "Loading your Closing Day portfolio...",
    saveProgressTitle: "Save your progress",
    saveProgressBody:
      "You came in through a magic link. Set a password once and you can come back without needing a new link.",
    saveProgressTrust:
      "This only upgrades how you sign in. Your transaction access and saved activity stay exactly the same.",
    passwordLabel: "Create a password",
    passwordPlaceholder: "Choose a password with at least 6 characters",
    saveProgressButton: "Save Password",
    savingPassword: "Saving password...",
    saveProgressSuccess: "Password saved. Future sign-ins can use email and password.",
    saveProgressError: "Could not save your password",
    trustTitle: "Trust controls",
    trustBadgeLive: "AI live/fallback labeled",
    trustBadgeOverride: "Agent override visible",
    trustBadgeWhy: "Why explanations included",
    trustBody:
      "Closing Day always labels live AI vs fallback responses, shows why a summary or answer appeared, and keeps the agent override path visible.",
    trustPauseOn: "Pause AI help",
    trustPauseOff: "Resume AI help",
    trustPausedNotice:
      "AI summaries and assistant responses are paused. Your documents stay available and you can turn the helper back on any time.",
    documentsDescription:
      "This transaction updates in real time. New documents, agent edits, and fresh activity appear while the page is open.",
    backToPortfolio: "Back to Portfolio",
    availableDocuments: "Available Documents",
    selectDocument: "Select a document to open the PDF and summary.",
    loadingDocuments: "Loading your transaction documents...",
    noDocumentSelected: "Select a document to see the PDF preview and summary.",
    loadingPdf: "Loading PDF preview...",
    pdfUnavailable: "PDF preview unavailable.",
    whatThisIs: "What This Is",
    watchFor: "Watch For",
    askYourAgent: "Ask Your Agent",
    plainEnglishTranslation: "Plain-English Translation",
    show: "Show",
    hide: "Hide",
    agentEdited: "Agent edited",
    summaryUnavailable: "The document uploaded successfully, but a summary is not available yet.",
    aiPausedSummary:
      "AI explanations are paused right now. Resume AI help from the trust controls to see the summary and translation again.",
    questionChatTitle: "Question Chat",
    questionChatDescription:
      "Ask what this document means, what happens next, or what should raise a flag. Higher-stakes judgment questions still route back to your agent.",
    questionChatEmpty:
      "Ask the first question about this transaction or document. Closing Day will answer in context and flag the agent when the question moves into risk, judgment, or emotional territory.",
    questionChatPlaceholder:
      "Ask what this means, what happens next, or whether something should worry you.",
    questionChatFooter:
      "The answer uses the selected document and transaction context. Strategy calls still go back to your agent.",
    questionSending: "Sending...",
    questionAsk: "Ask Question",
    questionTyping: "Closing Day is typing...",
    questionRouted: "Routed to agent",
    questionNextStep: "Next step",
    questionPaused:
      "AI Q&A is paused. Resume AI help to ask a new question while keeping the existing history visible.",
    questionFailed: "Question failed to send",
    retry: "Retry",
    checkInTitle: "Quick Check-In",
    checkInDescription:
      "Share how this transaction feels right now. Emotional signals help decide whether your agent can stay hands-off or should step in.",
    checkInEmpty:
      "No recent check-in yet. A short note like \"I feel good now\" or \"I am second guessing this house\" is enough to update the agent view.",
    currentReadiness: "Current readiness",
    checkInPlaceholder: "Example: I feel okay overall, but I am worried about the repair timeline.",
    checkInSubmit: "Submit Check-In",
    checkInSaving: "Saving...",
    checkInPaused:
      "AI check-ins are paused. Resume AI help to send a new emotional update while keeping your latest status visible.",
    checkInSavedTitle: "Check-in saved",
    checkInSavedBody:
      "Your latest sentiment signal has been recorded and the agent view is updating in real time.",
    checkInFailedTitle: "Check-in failed",
    severity: "Severity",
    languageToggleLabel: "Portal language"
  },
  es: {
    portfolioPhaseBadge: "Capa de confianza de la fase 7",
    welcome: "Bienvenida",
    portfolioDescription:
      "Tus documentos, resumenes y actualizaciones en vivo ya estan listos. Closing Day siempre muestra cuando la IA esta activa y te deja pausar la ayuda cuando quieras.",
    accessModeLabel: "Modo de acceso",
    accessMagicLink: "Enlace magico",
    accessPassword: "Correo y contrasena",
    languageLabel: "Idioma",
    savedProgressLabel: "Progreso guardado",
    passwordSet: "Contrasena creada",
    magicLinkOnly: "Solo enlace magico",
    transactionsHeading: "Tus transacciones activas",
    documentCountLabel: "documentos cargados",
    priceLabel: "Precio",
    expectedCloseLabel: "Cierre estimado",
    closedOnLabel: "Cerro el",
    openDocuments: "Abrir documentos",
    backToStatus: "Volver al estado del sistema",
    loadingPortfolio: "Cargando tu portal de Closing Day...",
    saveProgressTitle: "Guarda tu progreso",
    saveProgressBody:
      "Entraste con un enlace magico. Si creas una contrasena una sola vez, podras volver sin pedir otro enlace.",
    saveProgressTrust:
      "Esto solo cambia tu forma de iniciar sesion. Tu acceso a la transaccion y tu actividad guardada siguen igual.",
    passwordLabel: "Crea una contrasena",
    passwordPlaceholder: "Elige una contrasena de al menos 6 caracteres",
    saveProgressButton: "Guardar contrasena",
    savingPassword: "Guardando contrasena...",
    saveProgressSuccess: "Contrasena guardada. La proxima vez podras entrar con correo y contrasena.",
    saveProgressError: "No se pudo guardar la contrasena",
    trustTitle: "Controles de confianza",
    trustBadgeLive: "IA en vivo o alternativa visible",
    trustBadgeOverride: "Edicion del agente visible",
    trustBadgeWhy: "Explicaciones del por que incluidas",
    trustBody:
      "Closing Day siempre etiqueta cuando la IA esta activa o en modo alternativo, explica por que ves cada respuesta y mantiene visible la opcion de edicion del agente.",
    trustPauseOn: "Pausar ayuda de IA",
    trustPauseOff: "Reanudar ayuda de IA",
    trustPausedNotice:
      "Los resumenes y respuestas de IA estan en pausa. Tus documentos siguen disponibles y puedes reactivar la ayuda cuando quieras.",
    documentsDescription:
      "Esta transaccion se actualiza en tiempo real. Nuevos documentos, cambios del agente y actividad reciente aparecen mientras la pagina esta abierta.",
    backToPortfolio: "Volver al portafolio",
    availableDocuments: "Documentos disponibles",
    selectDocument: "Selecciona un documento para abrir el PDF y su resumen.",
    loadingDocuments: "Cargando los documentos de tu transaccion...",
    noDocumentSelected: "Selecciona un documento para ver el PDF y el resumen.",
    loadingPdf: "Cargando vista previa del PDF...",
    pdfUnavailable: "La vista previa del PDF no esta disponible.",
    whatThisIs: "Que es esto",
    watchFor: "Que debes vigilar",
    askYourAgent: "Que preguntar a tu agente",
    plainEnglishTranslation: "Traduccion sencilla",
    show: "Mostrar",
    hide: "Ocultar",
    agentEdited: "Editado por el agente",
    summaryUnavailable: "El documento se subio correctamente, pero el resumen todavia no esta disponible.",
    aiPausedSummary:
      "Las explicaciones de IA estan en pausa. Vuelve a activar la ayuda desde los controles de confianza para ver otra vez el resumen y la traduccion.",
    questionChatTitle: "Chat de preguntas",
    questionChatDescription:
      "Pregunta que significa el documento, que sigue despues o que deberia preocuparte. Las preguntas de estrategia o juicio siguen yendo a tu agente.",
    questionChatEmpty:
      "Haz la primera pregunta sobre esta transaccion o documento. Closing Day respondera con contexto y avisara al agente si la pregunta entra en riesgo, juicio o preocupacion emocional.",
    questionChatPlaceholder:
      "Pregunta que significa esto, que sigue despues o si algo deberia preocuparte.",
    questionChatFooter:
      "La respuesta usa el documento seleccionado y el contexto de la transaccion. Las decisiones de estrategia siguen con tu agente.",
    questionSending: "Enviando...",
    questionAsk: "Enviar pregunta",
    questionTyping: "Closing Day esta escribiendo...",
    questionRouted: "Enviado al agente",
    questionNextStep: "Siguiente paso",
    questionPaused:
      "Las preguntas con IA estan en pausa. Reanuda la ayuda para enviar una nueva pregunta sin perder el historial existente.",
    questionFailed: "No se pudo enviar la pregunta",
    retry: "Reintentar",
    checkInTitle: "Revision rapida",
    checkInDescription:
      "Comparte como te sientes con esta transaccion ahora mismo. Estas senales ayudan a decidir si tu agente puede seguir a distancia o debe intervenir.",
    checkInEmpty:
      "Todavia no hay una revision reciente. Una frase corta como \"me siento bien\" o \"estoy dudando de la casa\" basta para actualizar la vista del agente.",
    currentReadiness: "Nivel actual",
    checkInPlaceholder: "Ejemplo: Me siento bien, pero me preocupa el tiempo para resolver las reparaciones.",
    checkInSubmit: "Enviar revision",
    checkInSaving: "Guardando...",
    checkInPaused:
      "Las revisiones con IA estan en pausa. Reanuda la ayuda para enviar una nueva actualizacion emocional.",
    checkInSavedTitle: "Revision guardada",
    checkInSavedBody:
      "Tu senal emocional ya se guardo y la vista del agente se esta actualizando en tiempo real.",
    checkInFailedTitle: "No se pudo guardar la revision",
    severity: "Severidad",
    languageToggleLabel: "Idioma del portal"
  }
} as const;

const readinessLabels = {
  clear: {
    en: "Clear",
    es: "Claro"
  },
  needs_light_touch: {
    en: "Needs light touch",
    es: "Necesita seguimiento ligero"
  },
  needs_full_attention: {
    en: "Needs full attention",
    es: "Necesita atencion completa"
  },
  booked: {
    en: "Booked",
    es: "Agendado"
  }
} as const;

const stageLabels: Record<string, { en: string; es: string }> = {
  offer: {
    en: "Offer",
    es: "Oferta"
  },
  under_contract: {
    en: "Under contract",
    es: "Bajo contrato"
  },
  inspection: {
    en: "Inspection period",
    es: "Periodo de inspeccion"
  },
  appraisal: {
    en: "Appraisal",
    es: "Avaluo"
  },
  closing: {
    en: "Closing",
    es: "Cierre"
  },
  closed: {
    en: "Closed",
    es: "Cerrado"
  },
  active_listing: {
    en: "Active listing",
    es: "Propiedad activa"
  }
};

const relationshipLabels: Record<string, { en: string; es: string }> = {
  primary_buyer: {
    en: "Primary buyer",
    es: "Compradora principal"
  },
  co_buyer: {
    en: "Co-buyer",
    es: "Co-comprador"
  },
  seller: {
    en: "Seller",
    es: "Vendedor"
  },
  co_seller: {
    en: "Co-seller",
    es: "Co-vendedor"
  },
  client: {
    en: "Client",
    es: "Cliente"
  }
};

const documentCategoryLabels: Record<string, { en: string; es: string }> = {
  purchase_agreement: {
    en: "Purchase agreement",
    es: "Contrato de compra"
  },
  inspection_report: {
    en: "Inspection report",
    es: "Reporte de inspeccion"
  },
  disclosure: {
    en: "Disclosure",
    es: "Divulgacion"
  },
  hoa: {
    en: "HOA packet",
    es: "Paquete del HOA"
  },
  generic: {
    en: "Generic document",
    es: "Documento general"
  }
};

const questionCategoryLabels: Record<string, { en: string; es: string }> = {
  clarification: {
    en: "Clarification",
    es: "Aclaracion"
  },
  concern: {
    en: "Concern",
    es: "Preocupacion"
  },
  judgment: {
    en: "Judgment",
    es: "Juicio"
  },
  procedural: {
    en: "Procedural",
    es: "Proceso"
  },
  confused: {
    en: "Confused",
    es: "Confusion"
  }
};

export function normalizeLanguage(value?: string | null): SupportedLanguage {
  return value === "es" ? "es" : "en";
}

export function getClientCopy(language: SupportedLanguage) {
  return clientCopy[language];
}

export function getDateLocale(language: SupportedLanguage): string {
  return language === "es" ? "es-US" : "en-US";
}

export function translateReadinessBucket(
  language: SupportedLanguage,
  bucket?: string
): string | undefined {
  if (!bucket) {
    return undefined;
  }

  const translated = readinessLabels[bucket as keyof typeof readinessLabels];
  return translated ? translated[language] : bucket.replaceAll("_", " ");
}

export function translateStageLabel(
  language: SupportedLanguage,
  stage: string,
  fallback: string
): string {
  return stageLabels[stage]?.[language] ?? fallback;
}

export function translateRelationshipRole(
  language: SupportedLanguage,
  role: string
): string {
  return relationshipLabels[role]?.[language] ?? role.replaceAll("_", " ");
}

export function translateDocumentCategory(
  language: SupportedLanguage,
  category: string
): string {
  return documentCategoryLabels[category]?.[language] ?? category.replaceAll("_", " ");
}

export function translateQuestionCategory(
  language: SupportedLanguage,
  category: string
): string {
  return questionCategoryLabels[category]?.[language] ?? category;
}
