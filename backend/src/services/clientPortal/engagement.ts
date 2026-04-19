import type { DocumentCategory, QuestionCategory, SentimentLabel } from "@shared";

import { prisma } from "../../lib/prisma";
import { classifyQuestion } from "../ai/questionClassifier";
import { computeReadiness } from "../ai/readinessComputer";
import { analyzeClientSentiment } from "../ai/sentimentAnalyzer";
import { answerTransactionQuestion } from "../ai/stageQA";
import { mapQuestionRecord, mapReadinessSnapshot, mapSentimentEntry } from "./repository";

interface AskTransactionQuestionInput {
  transactionId: string;
  clientAccountId: string;
  question: string;
  documentId?: string;
}

interface SubmitCheckInInput {
  transactionId: string;
  clientAccountId: string;
  response: string;
}

function trimToLength(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3).trim()}...`;
}

function excerptDocumentText(textContent: string): string {
  return trimToLength(textContent.replace(/\s+/g, " ").trim(), 2_500);
}

function normalizeQuestionSignals(
  questions: Array<{
    question: string;
    category: string;
    severity: number;
    emotionalDistress: boolean;
    propertyInterestSignal: string;
    routedToAgent: boolean;
  }>
): Array<{
  question: string;
  category: QuestionCategory;
  severity: number;
  emotionalDistress: boolean;
  propertyInterestSignal: "committed" | "evaluating" | "cooling";
  routedToAgent: boolean;
}> {
  return questions.map((question) => ({
    question: question.question,
    category: question.category as QuestionCategory,
    severity: question.severity,
    emotionalDistress: question.emotionalDistress,
    propertyInterestSignal: question.propertyInterestSignal as "committed" | "evaluating" | "cooling",
    routedToAgent: question.routedToAgent
  }));
}

function normalizeSentimentSignals(
  sentiments: Array<{
    question: string;
    response: string;
    sentiment: string;
    agentAlertNeeded: boolean;
    alertReason: string;
    recommendedAgentAction: string;
  }>
): Array<{
  question: string;
  response: string;
  sentiment: SentimentLabel;
  agentAlertNeeded: boolean;
  alertReason: string;
  recommendedAgentAction: string;
}> {
  return sentiments.map((sentiment) => ({
    question: sentiment.question,
    response: sentiment.response,
    sentiment: sentiment.sentiment as SentimentLabel,
    agentAlertNeeded: sentiment.agentAlertNeeded,
    alertReason: sentiment.alertReason,
    recommendedAgentAction: sentiment.recommendedAgentAction
  }));
}

export async function askTransactionQuestion(input: AskTransactionQuestionInput) {
  const transaction = await prisma.transaction.findFirst({
    where: {
      id: input.transactionId,
      clientRoles: {
        some: {
          clientAccountId: input.clientAccountId
        }
      }
    },
    include: {
      clientRoles: {
        where: {
          clientAccountId: input.clientAccountId
        },
        include: {
          clientAccount: true
        }
      },
      questions: {
        where: {
          clientAccountId: input.clientAccountId
        },
        orderBy: {
          askedAt: "desc"
        },
        take: 6
      },
      sentiments: {
        where: {
          clientAccountId: input.clientAccountId
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 6
      },
      readiness: {
        where: {
          clientAccountId: input.clientAccountId
        },
        orderBy: {
          computedAt: "desc"
        },
        take: 1
      }
    }
  });

  if (!transaction) {
    throw new Error("Transaction not found for this client.");
  }

  const clientRole = transaction.clientRoles[0];
  if (!clientRole) {
    throw new Error("Client role not found for this transaction.");
  }

  const document = input.documentId
    ? await prisma.documentRecord.findFirst({
        where: {
          id: input.documentId,
          transactionId: transaction.id
        }
      })
    : null;

  if (input.documentId && !document) {
    throw new Error("Selected document was not found on this transaction.");
  }

  const [classification, answer] = await Promise.all([
    classifyQuestion({
      question: input.question,
      propertyAddress: transaction.propertyAddress,
      transactionStage: transaction.stageLabel,
      ...(document ? { documentTitle: document.title, documentCategory: document.category as DocumentCategory } : {})
    }),
    answerTransactionQuestion({
      question: input.question,
      propertyAddress: transaction.propertyAddress,
      transactionStage: transaction.stageLabel,
      transactionRole: clientRole.role,
      ...(document
        ? {
            documentTitle: document.title,
            documentCategory: document.category as DocumentCategory,
            documentTextExcerpt: excerptDocumentText(document.textContent)
          }
        : {}),
      recentQuestions: transaction.questions.map((question) => question.question)
    })
  ]);

  const sentiment = await analyzeClientSentiment({
    source: "question",
    propertyAddress: transaction.propertyAddress,
    transactionStage: transaction.stageLabel,
    question: input.question,
    response: answer.answer,
    severityHint: classification.severity,
    emotionalDistressHint: classification.emotionalDistress,
    propertyInterestSignalHint: classification.propertyInterestSignal
  });

  const readiness = await computeReadiness({
    transactionId: transaction.id,
    clientAccountId: input.clientAccountId,
    propertyAddress: transaction.propertyAddress,
    transactionStage: transaction.stageLabel,
    recentQuestions: [
      {
        question: input.question,
        category: classification.category,
        severity: classification.severity,
        emotionalDistress: classification.emotionalDistress,
        propertyInterestSignal: classification.propertyInterestSignal,
        routedToAgent: classification.routedToAgent
      },
      ...normalizeQuestionSignals(transaction.questions).slice(0, 5)
    ],
    recentSentiments: [
      {
        question: input.question,
        response: answer.answer,
        sentiment: sentiment.sentiment,
        agentAlertNeeded: sentiment.agentAlertNeeded,
        alertReason: sentiment.alertReason,
        recommendedAgentAction: sentiment.recommendedAgentAction
      },
      ...normalizeSentimentSignals(transaction.sentiments).slice(0, 5)
    ],
    latestPropertyInterestSignal: sentiment.propertyInterestSignal
  });

  const previousBucket = transaction.readiness[0]?.bucket;
  const generatedBy = answer.generatedBy === "groq" || classification.generatedBy === "groq" ? "groq" : "fallback";

  const persisted = await prisma.$transaction(async (tx) => {
    const createdQuestion = await tx.question.create({
      data: {
        transactionId: transaction.id,
        clientAccountId: input.clientAccountId,
        ...(document ? { documentId: document.id } : {}),
        question: input.question,
        answer: answer.answer,
        ...(answer.nextStep ? { nextStep: answer.nextStep } : {}),
        category: classification.category,
        severity: classification.severity,
        requiresAgentFollowup: classification.requiresAgentFollowup,
        agentPrepNote: classification.agentPrepNote,
        emotionalDistress: classification.emotionalDistress,
        propertyInterestSignal: classification.propertyInterestSignal,
        routedToAgent: classification.routedToAgent,
        generatedBy
      },
      include: {
        document: {
          select: {
            title: true
          }
        },
        transaction: {
          select: {
            propertyAddress: true,
            stageLabel: true
          }
        }
      }
    });

    if (document) {
      await tx.documentRecord.update({
        where: {
          id: document.id
        },
        data: {
          questionCount: {
            increment: 1
          }
        }
      });
    }

    const createdSentiment = await tx.sentimentEntry.create({
      data: {
        transactionId: transaction.id,
        clientAccountId: input.clientAccountId,
        question: input.question,
        response: answer.answer,
        sentiment: sentiment.sentiment,
        confidence: sentiment.confidence,
        agentAlertNeeded: sentiment.agentAlertNeeded,
        alertReason: sentiment.alertReason,
        recommendedAgentAction: sentiment.recommendedAgentAction,
        ...(classification.emotionalDistress || classification.severity >= 4
          ? { derivedFromQuestionId: createdQuestion.id }
          : {}),
        generatedBy: sentiment.generatedBy
      },
      include: {
        transaction: {
          select: {
            propertyAddress: true,
            stageLabel: true
          }
        }
      }
    });

    const createdReadiness = await tx.readinessSnapshot.create({
      data: {
        transactionId: transaction.id,
        clientAccountId: input.clientAccountId,
        bucket: readiness.snapshot.bucket,
        reasoning: readiness.snapshot.reasoning,
        topConcerns: JSON.stringify(readiness.snapshot.topConcerns),
        propertyInterestSignal: readiness.snapshot.propertyInterestSignal,
        recommendedAgentAction: readiness.snapshot.recommendedAgentAction
      }
    });

    await tx.notification.create({
      data: {
        agentId: transaction.agentId,
        type: "question_asked",
        title: `${clientRole.clientAccount.firstName} asked a new question`,
        body: trimToLength(input.question, 180),
        relatedId: createdQuestion.id
      }
    });

    if (
      sentiment.agentAlertNeeded ||
      previousBucket !== createdReadiness.bucket ||
      classification.routedToAgent
    ) {
      await tx.notification.create({
        data: {
          agentId: transaction.agentId,
          type: "sentiment_changed",
          title: `${clientRole.clientAccount.firstName} now needs ${createdReadiness.bucket.replaceAll("_", " ")}`,
          body: sentiment.alertReason,
          relatedId: createdReadiness.id
        }
      });
    }

    return {
      question: createdQuestion,
      sentiment: createdSentiment,
      readiness: createdReadiness
    };
  });

  return {
    agentId: transaction.agentId,
    transactionId: transaction.id,
    clientAccountId: input.clientAccountId,
    question: mapQuestionRecord(persisted.question),
    sentiment: mapSentimentEntry(persisted.sentiment),
    readiness: mapReadinessSnapshot(persisted.readiness),
    classificationLabel: `${classification.category}:${classification.severity}`
  };
}

export async function submitTransactionCheckIn(input: SubmitCheckInInput) {
  const transaction = await prisma.transaction.findFirst({
    where: {
      id: input.transactionId,
      clientRoles: {
        some: {
          clientAccountId: input.clientAccountId
        }
      }
    },
    include: {
      agent: true,
      clientRoles: {
        where: {
          clientAccountId: input.clientAccountId
        },
        include: {
          clientAccount: true
        }
      },
      questions: {
        where: {
          clientAccountId: input.clientAccountId
        },
        orderBy: {
          askedAt: "desc"
        },
        take: 6
      },
      sentiments: {
        where: {
          clientAccountId: input.clientAccountId
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 6
      },
      readiness: {
        where: {
          clientAccountId: input.clientAccountId
        },
        orderBy: {
          computedAt: "desc"
        },
        take: 1
      }
    }
  });

  if (!transaction) {
    throw new Error("Transaction not found for this client.");
  }

  const clientRole = transaction.clientRoles[0];
  if (!clientRole) {
    throw new Error("Client role not found for this transaction.");
  }

  const checkInQuestion = "Check-in: How are you feeling about this transaction right now?";
  const sentiment = await analyzeClientSentiment({
    source: "check_in",
    propertyAddress: transaction.propertyAddress,
    transactionStage: transaction.stageLabel,
    question: checkInQuestion,
    response: input.response
  });

  const readiness = await computeReadiness({
    transactionId: transaction.id,
    clientAccountId: input.clientAccountId,
    propertyAddress: transaction.propertyAddress,
    transactionStage: transaction.stageLabel,
    recentQuestions: normalizeQuestionSignals(transaction.questions).slice(0, 6),
    recentSentiments: [
      {
        question: checkInQuestion,
        response: input.response,
        sentiment: sentiment.sentiment,
        agentAlertNeeded: sentiment.agentAlertNeeded,
        alertReason: sentiment.alertReason,
        recommendedAgentAction: sentiment.recommendedAgentAction
      },
      ...normalizeSentimentSignals(transaction.sentiments).slice(0, 5)
    ],
    latestPropertyInterestSignal: sentiment.propertyInterestSignal
  });

  const previousBucket = transaction.readiness[0]?.bucket;

  const persisted = await prisma.$transaction(async (tx) => {
    const createdSentiment = await tx.sentimentEntry.create({
      data: {
        transactionId: transaction.id,
        clientAccountId: input.clientAccountId,
        question: checkInQuestion,
        response: input.response,
        sentiment: sentiment.sentiment,
        confidence: sentiment.confidence,
        agentAlertNeeded: sentiment.agentAlertNeeded,
        alertReason: sentiment.alertReason,
        recommendedAgentAction: sentiment.recommendedAgentAction,
        generatedBy: sentiment.generatedBy
      },
      include: {
        transaction: {
          select: {
            propertyAddress: true,
            stageLabel: true
          }
        }
      }
    });

    const createdReadiness = await tx.readinessSnapshot.create({
      data: {
        transactionId: transaction.id,
        clientAccountId: input.clientAccountId,
        bucket: readiness.snapshot.bucket,
        reasoning: readiness.snapshot.reasoning,
        topConcerns: JSON.stringify(readiness.snapshot.topConcerns),
        propertyInterestSignal: readiness.snapshot.propertyInterestSignal,
        recommendedAgentAction: readiness.snapshot.recommendedAgentAction
      }
    });

    if (sentiment.agentAlertNeeded || previousBucket !== createdReadiness.bucket) {
      await tx.notification.create({
        data: {
          agentId: transaction.agentId,
          type: "sentiment_changed",
          title: `${clientRole.clientAccount.firstName} submitted a check-in`,
          body: sentiment.alertReason,
          relatedId: createdSentiment.id
        }
      });
    }

    return {
      sentiment: createdSentiment,
      readiness: createdReadiness
    };
  });

  return {
    agentId: transaction.agentId,
    transactionId: transaction.id,
    clientAccountId: input.clientAccountId,
    sentiment: mapSentimentEntry(persisted.sentiment),
    readiness: mapReadinessSnapshot(persisted.readiness)
  };
}
