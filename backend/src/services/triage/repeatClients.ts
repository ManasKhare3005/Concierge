import type {
  AgentRepeatClientCard,
  AgentRepeatClientTier,
  AgentRepeatClientsResponse
} from "@shared";

import { prisma } from "../../lib/prisma";

interface DemoRepeatClientMetadata {
  tier: AgentRepeatClientTier;
  equityGainPct: number;
  lifeEventSignals: string[];
  outcomeLabel: string;
  recommendedAction: string;
  roiPotentialDollars: number;
}

const repeatClientMetadataByAddress: Record<string, DemoRepeatClientMetadata> = {
  "217 Oak Park Dr": {
    tier: "immediate",
    equityGainPct: 18,
    lifeEventSignals: [
      "Move-up equity window is already meaningful after a strong first six months.",
      "Summer timing makes a value-check conversation naturally timely.",
      "Recent smooth closing makes this client more likely to re-engage without heavy nurturing."
    ],
    outcomeLabel: "Equity up 18% since close",
    recommendedAction:
      "Send a home-equity check-in this week and offer a 15-minute move-up strategy call before summer inventory changes.",
    roiPotentialDollars: 10_400
  },
  "6408 Maple Ridge Dr": {
    tier: "nurture",
    equityGainPct: 31,
    lifeEventSignals: [
      "Longer hold period and strong appreciation open up refinance or trade-up conversations.",
      "High equity gives this client multiple next-step options without a hard sell.",
      "Past transaction history suggests a wealth-building angle will land better than a generic sales touch."
    ],
    outcomeLabel: "Equity up 31% since close",
    recommendedAction:
      "Keep this client on a wealth-building nurture track with annual value updates and a soft re-entry path into planning conversations.",
    roiPotentialDollars: 12_800
  }
};

function monthsSince(date: Date, now: Date): number {
  return Math.max(
    0,
    (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth())
  );
}

function fallbackMetadata(propertyAddress: string, propertyPrice?: number | null): DemoRepeatClientMetadata {
  const basis = propertyPrice ?? 500_000;

  return {
    tier: "soon",
    equityGainPct: 14,
    lifeEventSignals: [
      "Equity is likely large enough to justify a value update conversation.",
      "A prior closing relationship already lowers the trust barrier for a repeat touch.",
      "This client may be responsive to a simple planning-oriented re-engagement."
    ],
    outcomeLabel: `Repeat-client upside building at ${propertyAddress}`,
    recommendedAction:
      "Send a concise value-update note and invite the client into a low-pressure planning conversation.",
    roiPotentialDollars: Math.round(basis * 0.018)
  };
}

export async function buildRepeatClients(agentId: string): Promise<AgentRepeatClientsResponse> {
  const now = new Date();
  const closedTransactions = await prisma.transaction.findMany({
    where: {
      agentId,
      stage: "closed"
    },
    include: {
      clientRoles: {
        include: {
          clientAccount: true
        }
      }
    },
    orderBy: {
      closedAt: "desc"
    }
  });

  const grouped: AgentRepeatClientsResponse["grouped"] = {
    immediate: [],
    soon: [],
    nurture: []
  };

  for (const transaction of closedTransactions) {
    const metadata =
      repeatClientMetadataByAddress[transaction.propertyAddress] ??
      fallbackMetadata(transaction.propertyAddress, transaction.propertyPrice);
    const closedAt = transaction.closedAt ?? transaction.expectedCloseAt ?? transaction.createdAt;
    const months = monthsSince(closedAt, now);
    const estimatedCurrentValue = Math.round(
      (transaction.propertyPrice ?? 0) * (1 + metadata.equityGainPct / 100)
    );

    for (const clientRole of transaction.clientRoles) {
      const card: AgentRepeatClientCard = {
        clientAccountId: clientRole.clientAccountId,
        transactionId: transaction.id,
        clientName: `${clientRole.clientAccount.firstName} ${clientRole.clientAccount.lastName}`,
        propertyAddress: transaction.propertyAddress,
        propertyCity: transaction.propertyCity,
        propertyState: transaction.propertyState,
        propertyZip: transaction.propertyZip,
        closedAt: closedAt.toISOString(),
        monthsSinceClose: months,
        equityGainPct: metadata.equityGainPct,
        estimatedCurrentValue,
        ...(transaction.propertyPrice ? { originalPrice: transaction.propertyPrice } : {}),
        tier: metadata.tier,
        lifeEventSignals: metadata.lifeEventSignals,
        outcomeLabel: metadata.outcomeLabel,
        recommendedAction: metadata.recommendedAction,
        roleLabel: clientRole.role.replaceAll("_", " "),
        roiPotentialDollars: metadata.roiPotentialDollars
      };

      grouped[card.tier].push(card);
    }
  }

  for (const tier of Object.keys(grouped) as AgentRepeatClientTier[]) {
    grouped[tier].sort((left, right) => right.roiPotentialDollars - left.roiPotentialDollars);
  }

  const allCards = [...grouped.immediate, ...grouped.soon, ...grouped.nurture];

  return {
    grouped,
    roi: {
      estimatedPipelineValue: allCards.reduce((sum, card) => sum + card.roiPotentialDollars, 0),
      annualFollowUpHoursSaved: Math.max(2, allCards.length * 4),
      immediateOpportunityCount: grouped.immediate.length
    },
    summary: {
      totalClients: allCards.length,
      immediate: grouped.immediate.length,
      soon: grouped.soon.length,
      nurture: grouped.nurture.length
    }
  };
}
