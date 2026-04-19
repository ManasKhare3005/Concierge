import bcrypt from "bcryptjs";

import { logger } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { issueMagicLinkPortal } from "../services/magicLink";
import { ensureSeedPdfs } from "./seedPdfs";

function addDays(baseDate: Date, days: number): Date {
  return new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
}

function addHours(baseDate: Date, hours: number): Date {
  return new Date(baseDate.getTime() + hours * 60 * 60 * 1000);
}

function subtractDays(baseDate: Date, days: number): Date {
  return addDays(baseDate, -days);
}

function subtractHours(baseDate: Date, hours: number): Date {
  return addHours(baseDate, -hours);
}

function subtractMonths(baseDate: Date, months: number): Date {
  return new Date(
    baseDate.getFullYear(),
    baseDate.getMonth() - months,
    baseDate.getDate(),
    baseDate.getHours(),
    baseDate.getMinutes(),
    baseDate.getSeconds(),
    baseDate.getMilliseconds()
  );
}

async function clearDatabase(): Promise<void> {
  await prisma.notification.deleteMany();
  await prisma.botCallSession.deleteMany();
  await prisma.readinessSnapshot.deleteMany();
  await prisma.sentimentEntry.deleteMany();
  await prisma.question.deleteMany();
  await prisma.documentRecord.deleteMany();
  await prisma.magicLinkPortal.deleteMany();
  await prisma.clientRole.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.clientAccount.deleteMany();
  await prisma.agentAccount.deleteMany();
}

async function seed(): Promise<void> {
  await prisma.$connect();
  await clearDatabase();

  const seedPdfs = await ensureSeedPdfs();
  const now = new Date();
  const demoPasswordHash = await bcrypt.hash("demo123", 10);

  const agent = await prisma.agentAccount.create({
    data: {
      email: "james@closingday.demo",
      passwordHash: demoPasswordHash,
      firstName: "James",
      lastName: "Chen",
      brokerage: "RE/MAX Premier",
      createdAt: subtractMonths(now, 18)
    }
  });

  const sarah = await prisma.clientAccount.create({
    data: {
      email: "sarah@closingday.demo",
      passwordHash: demoPasswordHash,
      firstName: "Sarah",
      lastName: "Lee",
      phone: "480-555-0131",
      preferredLanguage: "en",
      createdAt: subtractMonths(now, 1)
    }
  });

  const marcus = await prisma.clientAccount.create({
    data: {
      email: "marcus@closingday.demo",
      passwordHash: demoPasswordHash,
      firstName: "Marcus",
      lastName: "Lee",
      phone: "480-555-0132",
      preferredLanguage: "en",
      createdAt: subtractMonths(now, 1)
    }
  });

  const maria = await prisma.clientAccount.create({
    data: {
      email: "maria@closingday.demo",
      passwordHash: demoPasswordHash,
      firstName: "Maria",
      lastName: "Gonzalez",
      phone: "602-555-0118",
      preferredLanguage: "es",
      createdAt: subtractMonths(now, 2)
    }
  });

  const david = await prisma.clientAccount.create({
    data: {
      email: "david@closingday.demo",
      passwordHash: demoPasswordHash,
      firstName: "David",
      lastName: "Kim",
      phone: "480-555-0176",
      preferredLanguage: "en",
      createdAt: subtractMonths(now, 3)
    }
  });

  const jennifer = await prisma.clientAccount.create({
    data: {
      email: "jennifer@closingday.demo",
      passwordHash: demoPasswordHash,
      firstName: "Jennifer",
      lastName: "Walsh",
      phone: "480-555-0154",
      preferredLanguage: "en",
      createdAt: subtractMonths(now, 8)
    }
  });

  const daniel = await prisma.clientAccount.create({
    data: {
      email: "daniel@closingday.demo",
      passwordHash: demoPasswordHash,
      firstName: "Daniel",
      lastName: "Cho",
      phone: "480-555-0198",
      preferredLanguage: "en",
      createdAt: subtractMonths(now, 30)
    }
  });

  const sarahTransaction = await prisma.transaction.create({
    data: {
      agentId: agent.id,
      role: "buy",
      propertyAddress: "4421 Olive St",
      propertyCity: "Tempe",
      propertyState: "AZ",
      propertyZip: "85281",
      propertyPrice: 720000,
      stage: "inspection",
      stageLabel: "Inspection period",
      contractAt: subtractDays(now, 20),
      expectedCloseAt: addDays(now, 5),
      source: "demo",
      createdAt: subtractDays(now, 28)
    }
  });

  const mariaTransaction = await prisma.transaction.create({
    data: {
      agentId: agent.id,
      role: "buy",
      propertyAddress: "2118 Cactus Bloom Way",
      propertyCity: "Phoenix",
      propertyState: "AZ",
      propertyZip: "85032",
      propertyPrice: 495000,
      stage: "under_contract",
      stageLabel: "Under contract",
      contractAt: subtractDays(now, 12),
      expectedCloseAt: addDays(now, 18),
      source: "demo",
      createdAt: subtractDays(now, 19)
    }
  });

  const davidTransaction = await prisma.transaction.create({
    data: {
      agentId: agent.id,
      role: "sell",
      propertyAddress: "887 Pine Ave",
      propertyCity: "Scottsdale",
      propertyState: "AZ",
      propertyZip: "85251",
      propertyPrice: 890000,
      stage: "active_listing",
      stageLabel: "Active listing",
      listedAt: subtractDays(now, 23),
      source: "demo",
      createdAt: subtractDays(now, 25)
    }
  });

  const jenniferTransaction = await prisma.transaction.create({
    data: {
      agentId: agent.id,
      role: "buy",
      propertyAddress: "217 Oak Park Dr",
      propertyCity: "Mesa",
      propertyState: "AZ",
      propertyZip: "85204",
      propertyPrice: 545000,
      stage: "closed",
      stageLabel: "Closed",
      contractAt: subtractMonths(now, 7),
      expectedCloseAt: subtractMonths(now, 6),
      closedAt: subtractMonths(now, 6),
      source: "demo",
      createdAt: subtractMonths(now, 7)
    }
  });

  const danielTransaction = await prisma.transaction.create({
    data: {
      agentId: agent.id,
      role: "buy",
      propertyAddress: "6408 Maple Ridge Dr",
      propertyCity: "Chandler",
      propertyState: "AZ",
      propertyZip: "85249",
      propertyPrice: 620000,
      stage: "closed",
      stageLabel: "Closed",
      contractAt: subtractMonths(now, 31),
      expectedCloseAt: subtractMonths(now, 30),
      closedAt: subtractMonths(now, 30),
      source: "demo",
      createdAt: subtractMonths(now, 31)
    }
  });

  await prisma.clientRole.createMany({
    data: [
      {
        transactionId: sarahTransaction.id,
        clientAccountId: sarah.id,
        role: "primary_buyer",
        activatedAt: subtractDays(now, 20)
      },
      {
        transactionId: sarahTransaction.id,
        clientAccountId: marcus.id,
        role: "co_buyer",
        activatedAt: subtractDays(now, 20)
      },
      {
        transactionId: mariaTransaction.id,
        clientAccountId: maria.id,
        role: "primary_buyer",
        activatedAt: subtractDays(now, 12)
      },
      {
        transactionId: davidTransaction.id,
        clientAccountId: david.id,
        role: "seller",
        activatedAt: subtractDays(now, 23)
      },
      {
        transactionId: jenniferTransaction.id,
        clientAccountId: jennifer.id,
        role: "primary_buyer",
        activatedAt: subtractMonths(now, 7)
      },
      {
        transactionId: danielTransaction.id,
        clientAccountId: daniel.id,
        role: "primary_buyer",
        activatedAt: subtractMonths(now, 31)
      }
    ]
  });

  const sarahPurchaseDocument = await prisma.documentRecord.create({
    data: {
      transactionId: sarahTransaction.id,
      title: "Purchase agreement - 4421 Olive St",
      category: seedPdfs.purchaseAgreement.category,
      filePath: seedPdfs.purchaseAgreement.filePath,
      textContent: seedPdfs.purchaseAgreement.textContent,
      uploadedAt: subtractDays(now, 18),
      uploadedBy: agent.id,
      summaryTlDr: seedPdfs.purchaseAgreement.summaryTlDr,
      summaryJson: JSON.stringify(seedPdfs.purchaseAgreement.summaryJson),
      summaryGeneratedAt: subtractDays(now, 18),
      summaryGeneratedBy: "fallback",
      openedByClient: true,
      openedAt: subtractHours(now, 30)
    }
  });

  const sarahInspectionDocument = await prisma.documentRecord.create({
    data: {
      transactionId: sarahTransaction.id,
      title: "Inspection report - 4421 Olive St",
      category: seedPdfs.inspectionReport.category,
      filePath: seedPdfs.inspectionReport.filePath,
      textContent: seedPdfs.inspectionReport.textContent,
      uploadedAt: subtractDays(now, 4),
      uploadedBy: agent.id,
      summaryTlDr: seedPdfs.inspectionReport.summaryTlDr,
      summaryJson: JSON.stringify(seedPdfs.inspectionReport.summaryJson),
      summaryGeneratedAt: subtractDays(now, 4),
      summaryGeneratedBy: "fallback",
      openedByClient: false
    }
  });

  const mariaPurchaseDocument = await prisma.documentRecord.create({
    data: {
      transactionId: mariaTransaction.id,
      title: "Purchase agreement - 2118 Cactus Bloom Way",
      category: seedPdfs.purchaseAgreement.category,
      filePath: seedPdfs.purchaseAgreement.filePath,
      textContent: seedPdfs.purchaseAgreement.textContent,
      uploadedAt: subtractDays(now, 11),
      uploadedBy: agent.id,
      summaryTlDr: seedPdfs.purchaseAgreement.summaryTlDr,
      summaryJson: JSON.stringify(seedPdfs.purchaseAgreement.summaryJson),
      summaryGeneratedAt: subtractDays(now, 11),
      summaryGeneratedBy: "fallback",
      openedByClient: true,
      openedAt: subtractDays(now, 9)
    }
  });

  const mariaInspectionDocument = await prisma.documentRecord.create({
    data: {
      transactionId: mariaTransaction.id,
      title: "Inspection report - 2118 Cactus Bloom Way",
      category: seedPdfs.inspectionReport.category,
      filePath: seedPdfs.inspectionReport.filePath,
      textContent: seedPdfs.inspectionReport.textContent,
      uploadedAt: subtractDays(now, 9),
      uploadedBy: agent.id,
      summaryTlDr: seedPdfs.inspectionReport.summaryTlDr,
      summaryJson: JSON.stringify(seedPdfs.inspectionReport.summaryJson),
      summaryGeneratedAt: subtractDays(now, 9),
      summaryGeneratedBy: "fallback",
      openedByClient: true,
      openedAt: subtractDays(now, 8)
    }
  });

  const mariaHoaDocument = await prisma.documentRecord.create({
    data: {
      transactionId: mariaTransaction.id,
      title: "HOA disclosure - Saguaro Vista",
      category: seedPdfs.hoaDisclosure.category,
      filePath: seedPdfs.hoaDisclosure.filePath,
      textContent: seedPdfs.hoaDisclosure.textContent,
      uploadedAt: subtractDays(now, 8),
      uploadedBy: agent.id,
      summaryTlDr: seedPdfs.hoaDisclosure.summaryTlDr,
      summaryJson: JSON.stringify(seedPdfs.hoaDisclosure.summaryJson),
      summaryGeneratedAt: subtractDays(now, 8),
      summaryGeneratedBy: "fallback",
      openedByClient: true,
      openedAt: subtractDays(now, 7)
    }
  });

  const davidHoaDocument = await prisma.documentRecord.create({
    data: {
      transactionId: davidTransaction.id,
      title: "HOA disclosure - 887 Pine Ave",
      category: seedPdfs.hoaDisclosure.category,
      filePath: seedPdfs.hoaDisclosure.filePath,
      textContent: seedPdfs.hoaDisclosure.textContent,
      uploadedAt: subtractDays(now, 20),
      uploadedBy: agent.id,
      summaryTlDr: seedPdfs.hoaDisclosure.summaryTlDr,
      summaryJson: JSON.stringify(seedPdfs.hoaDisclosure.summaryJson),
      summaryGeneratedAt: subtractDays(now, 20),
      summaryGeneratedBy: "fallback",
      openedByClient: false
    }
  });

  const sarahQuestion1 = await prisma.question.create({
    data: {
      transactionId: sarahTransaction.id,
      clientAccountId: sarah.id,
      documentId: sarahPurchaseDocument.id,
      question: "What is earnest money?",
      answer:
        "Earnest money is the good-faith deposit that shows the seller you are serious. It usually gets credited back to you at closing, but the contract says when it could be at risk if deadlines are missed.",
      nextStep: "Confirm the earnest money delivery deadline with title.",
      category: "clarification",
      severity: 2,
      requiresAgentFollowup: false,
      agentPrepNote: "Buyer needed basic contract education around deposit timing.",
      emotionalDistress: false,
      propertyInterestSignal: "committed",
      routedToAgent: false,
      generatedBy: "fallback",
      askedAt: subtractDays(now, 6)
    }
  });

  await prisma.question.create({
    data: {
      transactionId: sarahTransaction.id,
      clientAccountId: sarah.id,
      documentId: sarahPurchaseDocument.id,
      question: "If we back out, do we automatically lose the earnest money?",
      answer:
        "Not automatically. Whether earnest money is returned usually depends on whether a valid contingency still applies and whether deadlines were met. This is the kind of timeline question worth reviewing with your agent before making any decision.",
      nextStep: "Review inspection and appraisal contingency timing before making decisions.",
      category: "clarification",
      severity: 3,
      requiresAgentFollowup: false,
      agentPrepNote: "Buyer is thinking ahead about risk exposure.",
      emotionalDistress: false,
      propertyInterestSignal: "committed",
      routedToAgent: false,
      generatedBy: "fallback",
      askedAt: subtractDays(now, 4)
    }
  });

  const sarahQuestion3 = await prisma.question.create({
    data: {
      transactionId: sarahTransaction.id,
      clientAccountId: sarah.id,
      documentId: sarahInspectionDocument.id,
      question: "The inspection report mentions a roof issue. How serious is that?",
      answer:
        "The report does not say the roof failed that day, but it does say aging and sealant issues deserve contractor review. This is a good candidate for a seller credit or repair discussion before the inspection deadline.",
      nextStep: "Get a roofing estimate before sending the inspection response.",
      category: "concern",
      severity: 4,
      requiresAgentFollowup: true,
      agentPrepNote: "Buyer is worried about roof life and out-of-pocket repair cost.",
      emotionalDistress: true,
      propertyInterestSignal: "committed",
      routedToAgent: true,
      generatedBy: "fallback",
      askedAt: subtractHours(now, 18)
    }
  });

  const sarahQuestion4 = await prisma.question.create({
    data: {
      transactionId: sarahTransaction.id,
      clientAccountId: sarah.id,
      documentId: sarahPurchaseDocument.id,
      question: "Should we push back on the price because of all this?",
      answer:
        "That question involves strategy and negotiation judgment, so your agent should guide the final call. The inspection findings may support asking for repairs, credits, or a price adjustment depending on contractor estimates and seller posture.",
      nextStep: "Agent follow-up recommended to discuss negotiation strategy before the response deadline.",
      category: "judgment",
      severity: 5,
      requiresAgentFollowup: true,
      agentPrepNote: "Buyer is looking for negotiation advice, not just document explanation.",
      emotionalDistress: true,
      propertyInterestSignal: "committed",
      routedToAgent: true,
      generatedBy: "fallback",
      askedAt: subtractHours(now, 8)
    }
  });

  await prisma.question.create({
    data: {
      transactionId: sarahTransaction.id,
      clientAccountId: marcus.id,
      documentId: sarahPurchaseDocument.id,
      question: "What happens at closing if the inspection response is not resolved?",
      answer:
        "If the inspection response is still unresolved by the relevant deadline, the parties may need to extend, agree, or risk the buyer deciding not to move forward while a contingency is still open. Your agent should confirm exactly which deadline controls that decision.",
      nextStep: "Agent should confirm current inspection response deadline and seller response status.",
      category: "procedural",
      severity: 3,
      requiresAgentFollowup: false,
      agentPrepNote: "Co-buyer wants process clarity more than emotional support.",
      emotionalDistress: false,
      propertyInterestSignal: "committed",
      routedToAgent: false,
      generatedBy: "fallback",
      askedAt: subtractHours(now, 14)
    }
  });

  await prisma.question.create({
    data: {
      transactionId: mariaTransaction.id,
      clientAccountId: maria.id,
      documentId: mariaPurchaseDocument.id,
      question: "Cuando entregamos el dinero de arras?",
      answer:
        "El dinero de arras normalmente se entrega muy pronto despues de que el contrato queda aceptado. Tu agente o la compania de titulo pueden confirmar la fecha exacta que aplica en tu contrato.",
      nextStep: "Confirmar la fecha exacta con la compania de titulo.",
      category: "procedural",
      severity: 2,
      requiresAgentFollowup: false,
      agentPrepNote: "Buyer prefers Spanish and wants timing confirmation.",
      emotionalDistress: false,
      propertyInterestSignal: "committed",
      routedToAgent: false,
      generatedBy: "fallback",
      askedAt: subtractDays(now, 5)
    }
  });

  await prisma.question.create({
    data: {
      transactionId: mariaTransaction.id,
      clientAccountId: maria.id,
      documentId: mariaHoaDocument.id,
      question: "Hay reglas del HOA sobre rentar la casa despues?",
      answer:
        "Si. El paquete del HOA dice que rentas cortas no estan permitidas y que arrendamientos largos necesitan cumplir con reglas y aviso a la asociacion.",
      nextStep: "Revisar con tu agente si tu plan futuro coincide con las reglas del HOA.",
      category: "procedural",
      severity: 2,
      requiresAgentFollowup: false,
      agentPrepNote: "Buyer asked a normal policy question in Spanish.",
      emotionalDistress: false,
      propertyInterestSignal: "committed",
      routedToAgent: false,
      generatedBy: "fallback",
      askedAt: subtractDays(now, 3)
    }
  });

  await prisma.question.create({
    data: {
      transactionId: davidTransaction.id,
      clientAccountId: david.id,
      documentId: davidHoaDocument.id,
      question: "How much notice do I get before a showing?",
      answer:
        "Showing notice timing is usually handled through your listing instructions and MLS setup, not the HOA packet itself. Your agent can confirm the notice window currently being promised to buyers' agents.",
      nextStep: "Agent to confirm current showing instructions and seller preferences.",
      category: "procedural",
      severity: 2,
      requiresAgentFollowup: false,
      agentPrepNote: "Seller wants predictable showing logistics.",
      emotionalDistress: false,
      propertyInterestSignal: "evaluating",
      routedToAgent: false,
      generatedBy: "fallback",
      askedAt: subtractDays(now, 2)
    }
  });

  await prisma.question.create({
    data: {
      transactionId: davidTransaction.id,
      clientAccountId: david.id,
      question: "What does the offer process look like once someone is interested?",
      answer:
        "Once an offer comes in, your agent reviews price, terms, timelines, and contingencies with you before you accept, counter, or decline. The strongest offer is not always the highest number if the other terms create risk.",
      nextStep: "Prepare seller on likely counter strategy before first offer arrives.",
      category: "clarification",
      severity: 2,
      requiresAgentFollowup: false,
      agentPrepNote: "Seller is engaged and wants process coaching.",
      emotionalDistress: false,
      propertyInterestSignal: "evaluating",
      routedToAgent: false,
      generatedBy: "fallback",
      askedAt: subtractDays(now, 1)
    }
  });

  await prisma.documentRecord.update({
    where: { id: sarahPurchaseDocument.id },
    data: { questionCount: 3 }
  });

  await prisma.documentRecord.update({
    where: { id: sarahInspectionDocument.id },
    data: { questionCount: 1 }
  });

  await prisma.documentRecord.update({
    where: { id: mariaPurchaseDocument.id },
    data: { questionCount: 1 }
  });

  await prisma.documentRecord.update({
    where: { id: mariaHoaDocument.id },
    data: { questionCount: 1 }
  });

  await prisma.documentRecord.update({
    where: { id: davidHoaDocument.id },
    data: { questionCount: 1 }
  });

  await prisma.sentimentEntry.createMany({
    data: [
      {
        transactionId: sarahTransaction.id,
        clientAccountId: sarah.id,
        question: sarahQuestion3.question,
        response: "I am worried this roof turns into a huge expense right before closing.",
        sentiment: "anxious",
        confidence: 0.92,
        agentAlertNeeded: true,
        alertReason: "Buyer is escalating concern around repair cost and deal stability.",
        recommendedAgentAction: "Review roof estimate options and walk through negotiation choices live with Sarah.",
        derivedFromQuestionId: sarahQuestion3.id,
        generatedBy: "fallback",
        createdAt: subtractHours(now, 17)
      },
      {
        transactionId: sarahTransaction.id,
        clientAccountId: sarah.id,
        question: sarahQuestion4.question,
        response: "I really do not want to make the wrong call this late in the process.",
        sentiment: "anxious",
        confidence: 0.96,
        agentAlertNeeded: true,
        alertReason: "Buyer is seeking negotiation judgment and expressing stress close to closing.",
        recommendedAgentAction: "Schedule a direct conversation and give decision framing before inspection response is due.",
        derivedFromQuestionId: sarahQuestion4.id,
        generatedBy: "fallback",
        createdAt: subtractHours(now, 7)
      },
      {
        transactionId: sarahTransaction.id,
        clientAccountId: marcus.id,
        question: "What happens at closing if the inspection response is not resolved?",
        response: "I just want to understand the process so we do not get surprised.",
        sentiment: "curious",
        confidence: 0.84,
        agentAlertNeeded: false,
        alertReason: "Low urgency informational question.",
        recommendedAgentAction: "Send a brief process update and deadline recap.",
        generatedBy: "fallback",
        createdAt: subtractHours(now, 14)
      },
      {
        transactionId: mariaTransaction.id,
        clientAccountId: maria.id,
        question: "Como va todo?",
        response: "Me siento tranquila. Solo quiero entender bien los pasos.",
        sentiment: "calm",
        confidence: 0.9,
        agentAlertNeeded: false,
        alertReason: "Client is calm and engaged.",
        recommendedAgentAction: "Keep sending simple bilingual updates.",
        generatedBy: "fallback",
        createdAt: subtractDays(now, 2)
      },
      {
        transactionId: davidTransaction.id,
        clientAccountId: david.id,
        question: "How much notice do I get before a showing?",
        response: "I just want to plan my day around it.",
        sentiment: "curious",
        confidence: 0.82,
        agentAlertNeeded: false,
        alertReason: "Seller is curious but not upset.",
        recommendedAgentAction: "Share showing expectations and keep communication proactive.",
        generatedBy: "fallback",
        createdAt: subtractDays(now, 1)
      }
    ]
  });

  await prisma.readinessSnapshot.createMany({
    data: [
      {
        transactionId: sarahTransaction.id,
        clientAccountId: sarah.id,
        bucket: "needs_full_attention",
        reasoning:
          "Sarah is asking negotiation and repair-risk questions late in the inspection window and is showing anxious language tied to cost and making the wrong decision.",
        topConcerns: JSON.stringify([
          "Roof repair cost",
          "Whether to push back on price",
          "Risk tied to earnest money and deadlines"
        ]),
        propertyInterestSignal: "committed",
        recommendedAgentAction: "Call Sarah today, frame the roof issue with estimates, and lead the inspection response strategy.",
        computedAt: subtractHours(now, 6)
      },
      {
        transactionId: sarahTransaction.id,
        clientAccountId: marcus.id,
        bucket: "needs_light_touch",
        reasoning:
          "Marcus is engaged and asks process questions, but he is not showing distress or withdrawal.",
        topConcerns: JSON.stringify(["Closing timeline", "Inspection response status"]),
        propertyInterestSignal: "committed",
        recommendedAgentAction: "Send Marcus a concise timeline update and include the current status of negotiations.",
        computedAt: subtractHours(now, 12)
      },
      {
        transactionId: mariaTransaction.id,
        clientAccountId: maria.id,
        bucket: "clear",
        reasoning:
          "Maria has opened her documents, asks procedural questions, and is calm in tone with low-severity requests.",
        topConcerns: JSON.stringify(["Timing clarity", "HOA rental policy"]),
        propertyInterestSignal: "committed",
        recommendedAgentAction: "Keep Maria informed in Spanish and maintain the current cadence.",
        computedAt: subtractDays(now, 1)
      },
      {
        transactionId: davidTransaction.id,
        clientAccountId: david.id,
        bucket: "needs_light_touch",
        reasoning:
          "David is engaged and wants process coaching, but there is no distress signal and no urgent blocker.",
        topConcerns: JSON.stringify(["Showing logistics", "Offer review expectations"]),
        propertyInterestSignal: "evaluating",
        recommendedAgentAction: "Give David a quick listing communication plan and prep him for offer review.",
        computedAt: subtractHours(now, 20)
      }
    ]
  });

  const proposedSlots = [
    addDays(now, 1),
    addDays(now, 2),
    addDays(now, 3)
  ].map((date, index) => {
    const slot = new Date(date);
    slot.setHours(index === 0 ? 10 : index === 1 ? 13 : 16, 0, 0, 0);
    return slot.toISOString();
  });

  await prisma.botCallSession.create({
    data: {
      transactionId: sarahTransaction.id,
      clientAccountId: sarah.id,
      agentId: agent.id,
      status: "pending",
      topConcerns: JSON.stringify(["Roof issue", "Whether to renegotiate price", "Closing timeline confidence"]),
      proposedSlots: JSON.stringify(proposedSlots),
      tone: "warm",
      script: JSON.stringify([
        {
          speaker: "bot",
          text: "Hi Sarah, this is Closing Day calling on behalf of James Chen. I wanted to make sure we understand your top concerns before James reaches out."
        },
        {
          speaker: "client",
          text: "I am mostly stressed about the roof and whether we should push back on price."
        }
      ]),
      createdAt: subtractHours(now, 5)
    }
  });

  await prisma.notification.createMany({
    data: [
      {
        agentId: agent.id,
        type: "question_asked",
        title: "Sarah asked a negotiation question",
        body: "Sarah asked whether she should push back on the price after the roof finding.",
        relatedId: sarahQuestion4.id,
        createdAt: subtractHours(now, 8)
      },
      {
        agentId: agent.id,
        type: "sentiment_changed",
        title: "Sarah moved into high attention",
        body: "Her latest questions read as anxious and need direct agent follow-up.",
        relatedId: sarah.id,
        createdAt: subtractHours(now, 7)
      },
      {
        agentId: agent.id,
        type: "document_opened",
        title: "Sarah opened the purchase agreement",
        body: "The purchase agreement was opened in the client portal.",
        relatedId: sarahPurchaseDocument.id,
        createdAt: subtractHours(now, 30)
      },
      {
        agentId: agent.id,
        type: "document_opened",
        title: "Maria reviewed all three documents",
        body: "Maria has opened every document in her transaction and remains calm.",
        relatedId: maria.id,
        createdAt: subtractDays(now, 2)
      },
      {
        agentId: agent.id,
        type: "question_asked",
        title: "David wants offer-process coaching",
        body: "David asked what happens once an interested buyer submits an offer.",
        relatedId: david.id,
        createdAt: subtractDays(now, 1)
      }
    ]
  });

  const sarahMagicLink = await issueMagicLinkPortal({
    transactionId: sarahTransaction.id,
    clientAccountId: sarah.id,
    expiresAt: addDays(now, 14)
  });

  await issueMagicLinkPortal({
    transactionId: sarahTransaction.id,
    clientAccountId: marcus.id,
    expiresAt: addDays(now, 14)
  });

  await issueMagicLinkPortal({
    transactionId: mariaTransaction.id,
    clientAccountId: maria.id,
    expiresAt: addDays(now, 21)
  });

  await issueMagicLinkPortal({
    transactionId: davidTransaction.id,
    clientAccountId: david.id,
    expiresAt: addDays(now, 21)
  });

  logger.info("Phase 2 seed complete", {
    agentEmail: agent.email,
    activeClients: 4,
    activeTransactions: 3,
    closedTransactions: 2,
    seedAssets: Object.values(seedPdfs).map((asset) => asset.filename),
    sarahMagicLinkUrl: sarahMagicLink.url
  });
}

seed()
  .catch((error: unknown) => {
    logger.error("Seed failed", {
      error: error instanceof Error ? error.message : error
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
