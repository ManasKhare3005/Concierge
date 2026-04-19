import type {
  AgentActivityItem,
  AgentNotification,
  AgentTriageBucketKey,
  AgentTriageCard,
  AgentTriageResponse,
  SentimentTrend
} from "@shared";

import { prisma } from "../../lib/prisma";

function parseTopConcerns(topConcerns: string): string[] {
  try {
    const parsed = JSON.parse(topConcerns) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string").slice(0, 3);
    }
  } catch {
    return [topConcerns].filter(Boolean);
  }

  return [];
}

function trimToLength(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3).trim()}...`;
}

function sentimentWeight(sentiment: string): number {
  switch (sentiment) {
    case "calm":
      return 1;
    case "curious":
      return 2;
    case "excited":
      return 2;
    case "confused":
      return 3;
    case "anxious":
      return 4;
    case "frustrated":
      return 5;
    case "overwhelmed":
      return 6;
    default:
      return 2;
  }
}

function computeSentimentTrend(
  latestSentiment?: { sentiment: string },
  previousSentiment?: { sentiment: string }
): SentimentTrend {
  if (!latestSentiment || !previousSentiment) {
    return "flat";
  }

  const delta = sentimentWeight(latestSentiment.sentiment) - sentimentWeight(previousSentiment.sentiment);
  if (delta > 0) {
    return "up";
  }
  if (delta < 0) {
    return "down";
  }
  return "flat";
}

function roiMinutesForBucket(bucket: AgentTriageBucketKey): number {
  switch (bucket) {
    case "clear":
      return 30;
    case "needs_light_touch":
      return 18;
    case "booked":
      return 40;
    case "needs_full_attention":
    default:
      return 8;
  }
}

function roiDollarsForCard(bucket: AgentTriageBucketKey, propertyPrice?: number | null): number {
  const basis = propertyPrice ?? 450_000;
  switch (bucket) {
    case "clear":
      return Math.round(basis * 0.00035);
    case "needs_light_touch":
      return Math.round(basis * 0.00055);
    case "booked":
      return Math.round(basis * 0.00075);
    case "needs_full_attention":
    default:
      return Math.round(basis * 0.0011);
  }
}

function buildDraftText(card: {
  clientFirstName: string;
  stageLabel: string;
  propertyAddress: string;
  topConcerns: string[];
}): string {
  const concernText =
    card.topConcerns.length > 0 ? `I can see the biggest question right now is ${card.topConcerns[0]}.` : "I can see there is a lot moving at once.";

  return trimToLength(
    `Hi ${card.clientFirstName}, I just reviewed your ${card.stageLabel.toLowerCase()} progress for ${card.propertyAddress}. ${concernText} I am here to help, and I can walk you through the next step live if that would be useful.`,
    240
  );
}

function bucketLabelFromReadiness(bucket?: string): AgentTriageBucketKey {
  if (bucket === "clear" || bucket === "needs_light_touch" || bucket === "needs_full_attention") {
    return bucket;
  }

  return "needs_light_touch";
}

function mapNotificationActivity(notification: AgentNotification): AgentActivityItem {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    createdAt: notification.createdAt
  };
}

export async function buildAgentTriage(agentId: string): Promise<AgentTriageResponse> {
  const [transactions, notifications] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        agentId,
        stage: {
          not: "closed"
        }
      },
      include: {
        clientRoles: {
          include: {
            clientAccount: true
          }
        },
        questions: {
          orderBy: {
            askedAt: "desc"
          }
        },
        sentiments: {
          orderBy: {
            createdAt: "desc"
          }
        },
        readiness: {
          orderBy: {
            computedAt: "desc"
          }
        },
        botSessions: {
          orderBy: {
            createdAt: "desc"
          }
        }
      },
      orderBy: [
        {
          expectedCloseAt: "asc"
        },
        {
          createdAt: "desc"
        }
      ]
    }),
    prisma.notification.findMany({
      where: {
        agentId
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 20
    })
  ]);

  const grouped: AgentTriageResponse["grouped"] = {
    needs_full_attention: [],
    needs_light_touch: [],
    clear: [],
    booked: []
  };

  for (const transaction of transactions) {
    for (const clientRole of transaction.clientRoles) {
      const latestReadiness = transaction.readiness.find(
        (readiness) => readiness.clientAccountId === clientRole.clientAccountId
      );
      const latestSentiment = transaction.sentiments.find(
        (sentiment) => sentiment.clientAccountId === clientRole.clientAccountId
      );
      const previousSentiment = transaction.sentiments
        .filter((sentiment) => sentiment.clientAccountId === clientRole.clientAccountId)
        .at(1);
      const latestQuestion = transaction.questions.find(
        (question) => question.clientAccountId === clientRole.clientAccountId
      );
      const bookedSession = transaction.botSessions.find(
        (session) => session.clientAccountId === clientRole.clientAccountId && session.status === "booked"
      );

      const baseBucket = bucketLabelFromReadiness(latestReadiness?.bucket);
      const bucket: AgentTriageBucketKey = bookedSession ? "booked" : baseBucket;
      const topConcerns = latestReadiness ? parseTopConcerns(latestReadiness.topConcerns) : [];
      const roiMinutesSaved = roiMinutesForBucket(bucket);
      const roiDollarsProtected = roiDollarsForCard(bucket, transaction.propertyPrice);

      const card: AgentTriageCard = {
        clientAccountId: clientRole.clientAccountId,
        transactionId: transaction.id,
        clientName: `${clientRole.clientAccount.firstName} ${clientRole.clientAccount.lastName}`,
        clientFirstName: clientRole.clientAccount.firstName,
        roleLabel: clientRole.role.replaceAll("_", " "),
        preferredLanguage: clientRole.clientAccount.preferredLanguage,
        propertyAddress: transaction.propertyAddress,
        propertyCity: transaction.propertyCity,
        propertyState: transaction.propertyState,
        propertyZip: transaction.propertyZip,
        ...(transaction.propertyPrice ? { propertyPrice: transaction.propertyPrice } : {}),
        stage: transaction.stage,
        stageLabel: transaction.stageLabel,
        bucket,
        reasoning:
          latestReadiness?.reasoning ??
          "This client has activity in motion, but Closing Day has not yet captured enough signals to justify a stronger bucket.",
        topConcerns:
          topConcerns.length > 0
            ? topConcerns
            : latestQuestion
              ? [trimToLength(latestQuestion.question, 56)]
              : ["No major concern captured yet"],
        recommendedAgentAction:
          latestReadiness?.recommendedAgentAction ??
          "Check the latest activity and decide whether the client needs a short confidence-building follow-up.",
        propertyInterestSignal: (latestReadiness?.propertyInterestSignal ??
          latestQuestion?.propertyInterestSignal ??
          "committed") as AgentTriageCard["propertyInterestSignal"],
        ...(latestQuestion
          ? {
              latestQuestionExcerpt: trimToLength(latestQuestion.question, 110),
              latestQuestionSeverity: latestQuestion.severity,
              latestQuestionAskedAt: latestQuestion.askedAt.toISOString()
            }
          : {}),
        ...(latestSentiment
          ? {
              sentimentLabel: latestSentiment.sentiment as NonNullable<AgentTriageCard["sentimentLabel"]>,
              sentimentUpdatedAt: latestSentiment.createdAt.toISOString()
            }
          : {}),
        sentimentTrend: computeSentimentTrend(latestSentiment, previousSentiment),
        requiresAgentAttention:
          bucket === "needs_full_attention" ||
          latestQuestion?.routedToAgent === true ||
          latestSentiment?.agentAlertNeeded === true,
        roiMinutesSaved,
        roiDollarsProtected,
        roiLabel: `~${roiMinutesSaved} min saved by triaging this client instead of treating every file as urgent`,
        draftText: buildDraftText({
          clientFirstName: clientRole.clientAccount.firstName,
          stageLabel: transaction.stageLabel,
          propertyAddress: transaction.propertyAddress,
          topConcerns
        }),
        ...(bookedSession?.bookedSlot ? { bookedSlot: bookedSession.bookedSlot.toISOString() } : {})
      };

      grouped[bucket].push(card);
    }
  }

  for (const key of Object.keys(grouped) as AgentTriageBucketKey[]) {
    grouped[key].sort((left, right) => {
      const leftTime = left.latestQuestionAskedAt ?? left.sentimentUpdatedAt ?? "";
      const rightTime = right.latestQuestionAskedAt ?? right.sentimentUpdatedAt ?? "";
      return rightTime.localeCompare(leftTime);
    });
  }

  const allCards = [
    ...grouped.needs_full_attention,
    ...grouped.needs_light_touch,
    ...grouped.clear,
    ...grouped.booked
  ];

  return {
    grouped,
    roi: {
      estimatedMinutesSaved: allCards.reduce((sum, card) => sum + card.roiMinutesSaved, 0),
      estimatedRevenueProtected: allCards.reduce((sum, card) => sum + card.roiDollarsProtected, 0),
      lowTouchClients: grouped.clear.length + grouped.needs_light_touch.length,
      focusRecoveredMinutes:
        grouped.clear.reduce((sum, card) => sum + card.roiMinutesSaved, 0) +
        grouped.needs_light_touch.reduce((sum, card) => sum + Math.round(card.roiMinutesSaved * 0.75), 0)
    },
    recentActivity: notifications.map((notification) =>
      mapNotificationActivity({
        id: notification.id,
        type: notification.type as AgentNotification["type"],
        title: notification.title,
        body: notification.body,
        ...(notification.relatedId ? { relatedId: notification.relatedId } : {}),
        read: notification.read,
        createdAt: notification.createdAt.toISOString()
      })
    ),
    summary: {
      activeClients: allCards.length,
      needsFullAttention: grouped.needs_full_attention.length,
      needsLightTouch: grouped.needs_light_touch.length,
      clear: grouped.clear.length,
      booked: grouped.booked.length
    }
  };
}
