import fs from "node:fs";
import path from "node:path";
import { finished } from "node:stream/promises";

import type { DocumentCategory, DocumentSummarySections } from "@shared";
import PDFDocument from "pdfkit";

import { logger } from "../lib/logger";

type SeedPdfAssetKey = "purchaseAgreement" | "inspectionReport" | "hoaDisclosure";

interface SeedPdfPage {
  heading: string;
  paragraphs: string[];
}

export interface SeedPdfAsset {
  key: SeedPdfAssetKey;
  filename: string;
  title: string;
  category: DocumentCategory;
  filePath: string;
  textContent: string;
  summaryTlDr: string;
  summaryJson: DocumentSummarySections;
}

interface SeedPdfDefinition {
  key: SeedPdfAssetKey;
  filename: string;
  title: string;
  category: DocumentCategory;
  pages: SeedPdfPage[];
  summaryTlDr: string;
  summaryJson: DocumentSummarySections;
}

const seedPdfDefinitions: SeedPdfDefinition[] = [
  {
    key: "purchaseAgreement",
    filename: "purchase-agreement-sample.pdf",
    title: "Arizona Residential Resale Real Estate Purchase Contract",
    category: "purchase_agreement",
    pages: [
      {
        heading: "Page 1 - Contract Overview",
        paragraphs: [
          "This sample contract reflects a buyer offer for 4421 Olive St, Tempe, Arizona 85281, with a purchase price of $720,000. The named buyer is Sarah Lee and Marcus Lee, and the seller is Olive Street Holdings LLC. The document is formatted to resemble a standard Arizona resale purchase contract used in residential transactions.",
          "The opening section confirms the legal property description, identifies the real property improvements included in the sale, and notes that the buyer intends to occupy the property as a primary residence. It also states that the offer becomes binding when fully signed and delivered by the parties.",
          "This page gives agents and clients a plain starting point: who is buying, what property is involved, what price is being offered, and when the contract clock starts running."
        ]
      },
      {
        heading: "Page 2 - Earnest Money and Delivery Deadlines",
        paragraphs: [
          "The earnest money deposit is listed at $18,000 and must be delivered to Evergreen Title Services within one business day after contract acceptance. The contract explains that earnest money is a good-faith deposit that is credited to the buyer at closing if the transaction proceeds.",
          "It also states that if a party misses the earnest money delivery deadline, the other party may issue a cure notice before exercising default remedies. The escrow company is instructed to hold the earnest money consistent with contract terms and mutual instructions from the parties.",
          "Clients often focus on this page because it is where they learn the difference between money they are putting down now and the separate cash they may still need at closing."
        ]
      },
      {
        heading: "Page 3 - Financing and Appraisal",
        paragraphs: [
          "The buyer is obtaining conventional financing with a twenty percent down payment. Loan status update deadlines are listed, including a pre-qualification requirement, a loan application timeline, and a final loan commitment milestone.",
          "An appraisal contingency states that if the appraised value comes in below the purchase price, the buyer may renegotiate, contribute additional cash, or cancel if the parties do not reach an agreement before the contingency deadline.",
          "This section is important because it explains the practical relationship between lender approval, appraised value, and whether the deal can stay on track without new negotiation."
        ]
      },
      {
        heading: "Page 4 - Buyer Due Diligence and Inspection Rights",
        paragraphs: [
          "The buyer is granted a due diligence period to inspect the property, review seller disclosures, evaluate neighborhood conditions, and obtain any specialist reports the buyer considers appropriate. The contract states that the buyer should not rely solely on seller statements and may investigate material facts independently.",
          "It specifically references the buyer's right to review inspection findings, request repairs or credits, and cancel within the allowed period if the buyer is dissatisfied with the property condition or a material item cannot be resolved.",
          "This page is usually where anxious buyers start to understand that the inspection period is both a fact-finding phase and a negotiation window."
        ]
      },
      {
        heading: "Page 5 - Seller Disclosures and Property Condition",
        paragraphs: [
          "The seller agrees to provide the Arizona Seller's Property Disclosure Statement, insurance claims history, lead-based paint disclosure if applicable, and notice of any known material latent defects. The contract explains that disclosure obligations continue through closing for newly discovered material issues.",
          "The language makes clear that the property is not being sold with a warranty from the seller except as specifically stated, and that ordinary wear, cosmetic differences, and systems aging are still possible even if disclosed.",
          "This page helps clients understand why a disclosed condition is not always a contract violation but may still shape their decision-making and negotiation strategy."
        ]
      },
      {
        heading: "Page 6 - Title, HOA, and Property Transfer Items",
        paragraphs: [
          "Title is to be provided by Evergreen Title Services with an owner's policy paid as negotiated by the parties. The buyer receives a period to review the preliminary title report and object to liens, easements, legal description issues, or unacceptable exceptions.",
          "If the property is in a homeowners association, the seller must provide the community resale package, fee schedule, and governing documents. The buyer then receives a separate review period for HOA rules, budgets, and transfer costs.",
          "This section is often where clients discover that not every concern lives inside the purchase price; neighborhood rules, title exceptions, and transfer fees can materially affect comfort with the transaction."
        ]
      },
      {
        heading: "Page 7 - Closing Costs, Prorations, and Possession",
        paragraphs: [
          "The contract allocates routine closing expenses, including escrow fees, title insurance items, HOA transfer costs, and recording charges. Property taxes, rents, and association dues are prorated through the day of closing.",
          "Possession is transferred at close of escrow unless otherwise agreed in writing. Utilities, keys, garage remotes, mailbox access, and other control items are to be delivered at or immediately after closing.",
          "Clients generally use this page to understand that closing costs are not one single fee and that possession timing may differ slightly from when documents are signed."
        ]
      },
      {
        heading: "Page 8 - Cure Period, Default, and Dispute Process",
        paragraphs: [
          "If either party fails to comply with the contract, the non-breaching party may issue a cure notice giving the breaching party an opportunity to correct the issue before stronger remedies are used. If the issue is not cured, available remedies may include cancellation, release or dispute over earnest money, and possible legal claims.",
          "The sample language also references mediation before litigation and explains that broker involvement does not replace the need for legal advice if the parties are in a true dispute about rights or obligations.",
          "This page matters because it separates normal negotiation friction from actual default and helps clients understand when an agent should loop in title or legal counsel."
        ]
      },
      {
        heading: "Page 9 - Signatures, Addenda, and Final Checklist",
        paragraphs: [
          "The final page includes signature blocks for the buyers and seller, a list of incorporated addenda, acknowledgement of receipt options, and a checklist confirming the main deadlines already described in the contract.",
          "Common attached items include the buyer advisory, financing addendum, inspection notice and response form, and HOA resale disclosure receipt. The sample notes that electronic signatures are acceptable and delivery by email is effective unless otherwise stated.",
          "In plain English, the last page is the summary sheet that ties the rest of the contract together: who signed, what supporting forms matter, and what dates everyone now needs to watch."
        ]
      }
    ],
    summaryTlDr:
      "This purchase contract sets the price, earnest money, inspection rights, financing terms, title review, and closing responsibilities for the sale.",
    summaryJson: {
      whatThisIs:
        "This is the main agreement that says who is buying the home, how much they are paying, what deadlines apply, and what happens before closing.",
      watchFor: [
        "Earnest money must be delivered on time so the buyer is not in default.",
        "Inspection and appraisal deadlines control when the buyer can negotiate or cancel.",
        "Title, HOA, and closing-cost sections can create surprise costs or restrictions."
      ],
      askYourAgent: [
        "Which deadline is the next one that could change our leverage?",
        "If the inspection response is unresolved, what are our realistic options?",
        "Are there any title or HOA items that deserve a closer look before we move forward?"
      ],
      plainEnglishFullText:
        "This contract is the road map for the deal. It explains the offer price, the earnest money deposit, how financing and appraisal work, when inspections happen, what disclosures the seller must provide, how title and HOA review are handled, what closing costs are split, when the buyer gets possession, and what happens if someone misses a deadline."
    }
  },
  {
    key: "inspectionReport",
    filename: "inspection-report-sample.pdf",
    title: "Sunridge Property Inspections - Residential Inspection Report",
    category: "inspection_report",
    pages: [
      {
        heading: "Page 1 - Executive Summary",
        paragraphs: [
          "Inspection date: April 16, 2026. Property inspected: 4421 Olive St, Tempe, Arizona 85281. Inspector: Michael Ortega, Arizona licensed home inspector. Weather during inspection was dry and warm, with exterior temperatures in the upper seventies.",
          "The report identifies several deferred maintenance items and a small number of moderate-priority repair recommendations. Most systems were functional on the day of inspection, but the report advises review by qualified contractors for certain roofing, electrical safety, and plumbing concerns.",
          "This summary page is designed to help buyers separate safety and water-intrusion concerns from cosmetic or ordinary aging items."
        ]
      },
      {
        heading: "Page 2 - Roof Findings",
        paragraphs: [
          "Finding 1: The south-facing roof slope shows granular wear and aging consistent with an older asphalt shingle installation. Remaining useful life appears limited and future replacement budgeting is recommended.",
          "Finding 2: Flashing at one plumbing vent showed sealant deterioration. This condition can allow moisture intrusion if not maintained. A roofing contractor should reseal and verify surrounding underlayment condition.",
          "Finding 3: Debris accumulation was observed in one rear valley and should be cleared to improve drainage. Finding 4: Minor cracking was noted at a vent boot. Finding 5: Exposed nail heads were observed at a small repair area near the garage roof line."
        ]
      },
      {
        heading: "Page 3 - Exterior and Structural Observations",
        paragraphs: [
          "Finding 6: A minor vertical foundation crack was observed at the rear patio slab edge. No material displacement was seen at the time of inspection, but sealing and monitoring were recommended.",
          "Finding 7: Exterior caulking at several window penetrations is dried and pulling away. Re-caulking will help protect the wall assembly from water intrusion during seasonal rain events.",
          "Finding 8: The irrigation control box cover is damaged and should be replaced to protect electrical components. Finding 9: Wood trim at one rear door shows localized peeling paint and should be scraped, sealed, and repainted."
        ]
      },
      {
        heading: "Page 4 - Electrical System Findings",
        paragraphs: [
          "Finding 10: GFCI protection was missing at two kitchen countertop receptacles and one garage receptacle. Modern safety standards recommend GFCI protection in these areas to reduce shock risk.",
          "Finding 11: One exterior receptacle cover is not weather-tight in the closed position and should be replaced. Finding 12: The service panel had open knockouts that should be fitted with proper fillers.",
          "Finding 13: A loose switch plate and reversed hot-neutral condition were observed at one secondary bedroom outlet. A licensed electrician should correct these items."
        ]
      },
      {
        heading: "Page 5 - Plumbing and Water Heater Findings",
        paragraphs: [
          "Finding 14: The water heater date code indicates an age near the end of its common service life. It was functional on the day of inspection, but the buyer should budget for replacement in the near term.",
          "Finding 15: Active leaking was not observed, but slow drainage was noted at the hall bathroom sink. A plumber or drain specialist should evaluate if simple cleaning does not resolve the issue.",
          "Finding 16: The pressure relief discharge pipe at the water heater terminates close to the garage floor and should be rechecked for full compliance by a qualified plumber."
        ]
      },
      {
        heading: "Page 6 - HVAC and Attic Findings",
        paragraphs: [
          "Finding 17: The air conditioning system responded to normal thermostat controls, but temperature split was on the low end of the normal range. Seasonal servicing and coil cleaning are recommended before peak summer use.",
          "Finding 18: Limited staining was observed on attic sheathing near one roof penetration. The source appears consistent with a past minor leak, but current moisture was not confirmed during the inspection.",
          "Finding 19: Insulation depth was uneven in portions of the attic, which may contribute to comfort differences between rooms."
        ]
      },
      {
        heading: "Page 7 - Interior and Safety Findings",
        paragraphs: [
          "Finding 20: Smoke detector coverage was incomplete in one hallway. Carbon monoxide alarm placement should also be confirmed based on appliance configuration.",
          "Finding 21: A primary bedroom window met resistance during opening and should be adjusted for safe egress. Finding 22: Loose handrail hardware was noted at the garage step entry.",
          "Finding 23: Cosmetic drywall cracking was observed at a doorway corner and appeared consistent with minor settlement rather than an active structural movement pattern."
        ]
      },
      {
        heading: "Page 8 - Recommended Next Steps",
        paragraphs: [
          "The report recommends obtaining roofing, electrical, and plumbing evaluations from licensed contractors before the inspection response deadline if the buyer intends to request repairs, credits, or a price concession.",
          "Priority discussion items for negotiation are roof life expectancy, GFCI safety corrections, and water heater replacement planning. Secondary items include exterior maintenance, minor drainage concerns, and attic insulation balancing.",
          "The inspector emphasizes that this report is not a warranty, cannot predict future failure, and should be used with contractor estimates to make an informed decision."
        ]
      }
    ],
    summaryTlDr:
      "This inspection report says the house is generally functional but highlights roof aging, missing GFCI outlets, an older water heater, and a few maintenance items the buyer may want addressed.",
    summaryJson: {
      whatThisIs:
        "This is a home inspection report describing the condition of the property on the inspection date and calling out repair, safety, and maintenance concerns.",
      watchFor: [
        "Roof wear could lead to near-term repair or replacement costs.",
        "Missing GFCI protection is a safety issue and a common repair request.",
        "The aging water heater may work today but still be close to replacement."
      ],
      askYourAgent: [
        "Which issues are worth asking the seller to repair versus credit?",
        "Should we get a roofer or electrician quote before sending our inspection response?",
        "Do these findings change our comfort with the price or timeline?"
      ],
      plainEnglishFullText:
        "The inspector did not find a collapsing house, but they did find a list of real items the buyers should understand. The roof is aging, some electrical safety protection is missing, the water heater is old, and several smaller maintenance items need attention. The report gives the buyers leverage to ask questions, request repairs, or renegotiate before the inspection period ends."
    }
  },
  {
    key: "hoaDisclosure",
    filename: "hoa-disclosure-sample.pdf",
    title: "Saguaro Vista Community Association Resale Disclosure Packet",
    category: "hoa",
    pages: [
      {
        heading: "Page 1 - Community Overview",
        paragraphs: [
          "This resale disclosure packet is for the Saguaro Vista Community Association and is intended to provide a prospective buyer or seller with the governing rules, fees, and operational disclosures affecting the property.",
          "The association oversees common area landscaping, front-entry monument maintenance, neighborhood lighting, and enforcement of architectural and use restrictions described in the declaration and rules.",
          "The packet states that buyers should review the rules carefully before closing because membership and compliance obligations transfer with ownership."
        ]
      },
      {
        heading: "Page 2 - Regular Assessments and Transfer Fees",
        paragraphs: [
          "Current regular assessment dues are listed at $168 per month, payable on the first day of each month. A transfer processing fee, resale disclosure fee, and community enhancement contribution may also apply at closing.",
          "The packet notes that late fees and interest can accrue if assessments are not timely paid. It also explains that the association may issue special assessments if reserve levels or major repair needs require additional funding.",
          "For buyers, this page matters because the monthly dues are not the full story; one-time transfer costs and possible future special assessments can affect cash needs and comfort with the community."
        ]
      },
      {
        heading: "Page 3 - Use Restrictions",
        paragraphs: [
          "Community rules address quiet hours, exterior storage visibility, trash can placement, holiday lighting timing, and commercial vehicle restrictions. Home-based businesses may be limited if they create visible traffic or signage.",
          "Short-term leasing under thirty days is prohibited. Long-term leasing is allowed only if the owner provides the association with a copy of the lease summary and emergency contact information.",
          "These rules are not unusual for an HOA, but they can still surprise buyers who assume they have total freedom once they close."
        ]
      },
      {
        heading: "Page 4 - Architectural Control and Exterior Maintenance",
        paragraphs: [
          "Owners must submit architectural requests for exterior paint changes, major landscape changes, solar additions, patio covers, and fencing modifications. The packet includes response timelines and review criteria used by the architectural committee.",
          "Routine owner maintenance obligations include keeping visible exterior elements in good condition, preventing weed overgrowth, and repairing damaged gates, stucco, or trim when deterioration becomes apparent.",
          "This section matters because clients often think only large remodels need approval, but the community documents may require approval or strict matching standards for many visible changes."
        ]
      },
      {
        heading: "Page 5 - Parking, Pets, and Common Area Rules",
        paragraphs: [
          "Guest parking spaces are limited in duration and may not be used for long-term vehicle storage. Recreational vehicles and trailers must be stored off site unless temporary written approval is granted.",
          "The pet policy permits ordinary household pets subject to leash and nuisance restrictions. Owners are responsible for waste pickup and may be cited for repeated noise complaints or unsafe behavior involving animals.",
          "Common areas close nightly at posted hours and are governed by additional conduct rules intended to reduce after-hours disturbance."
        ]
      },
      {
        heading: "Page 6 - Financial and Litigation Disclosures",
        paragraphs: [
          "The resale packet includes a reserve summary, current year operating budget, statement of account, and a disclosure that no major pending litigation is known as of the packet date. Insurance carried by the association is described at a high level but does not replace an owner's personal coverage.",
          "The packet encourages buyers to ask the association manager or their agent about reserve funding health, upcoming capital projects, and whether recent dues changes suggest maintenance pressure within the community.",
          "In plain terms, this final section helps a buyer decide whether the community appears stable, affordable, and compatible with how they want to live."
        ]
      }
    ],
    summaryTlDr:
      "This HOA packet explains monthly dues, community rules, architectural restrictions, parking and pet rules, and the association's financial disclosures.",
    summaryJson: {
      whatThisIs:
        "This is the homeowners association resale packet that tells the buyer what the HOA charges, what it regulates, and what financial or rule-related issues could affect ownership.",
      watchFor: [
        "Monthly dues are only part of the cost because transfer fees and future special assessments can also matter.",
        "Rental, parking, and exterior-change rules can affect how flexible ownership feels.",
        "Reserve and budget information can hint at whether bigger fee increases may be coming."
      ],
      askYourAgent: [
        "Are there any HOA rules here that conflict with how I plan to use the property?",
        "Do the fees or reserve numbers suggest the community may need future increases?",
        "Which closing costs tied to the HOA will show up on my settlement statement?"
      ],
      plainEnglishFullText:
        "This packet is the HOA's rulebook and money summary. It tells a buyer what the monthly dues are, what extra fees may apply, what the association allows or restricts, how exterior changes are reviewed, and whether the community appears financially stable."
    }
  }
];

function buildTextContent(definition: SeedPdfDefinition): string {
  return [
    definition.title,
    ...definition.pages.flatMap((page) => [page.heading, ...page.paragraphs])
  ].join("\n\n");
}

async function writePdf(definition: SeedPdfDefinition, targetPath: string): Promise<void> {
  await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });

  const document = new PDFDocument({
    size: "LETTER",
    margin: 56
  });
  const output = fs.createWriteStream(targetPath);

  document.pipe(output);

  definition.pages.forEach((page, index) => {
    if (index > 0) {
      document.addPage();
    }

    document.font("Helvetica-Bold").fontSize(20).fillColor("#0f4f4c").text(definition.title);
    document.moveDown(0.6);
    document.font("Helvetica-Bold").fontSize(14).fillColor("#020617").text(page.heading);
    document.moveDown(0.8);

    page.paragraphs.forEach((paragraph) => {
      document
        .font("Helvetica")
        .fontSize(11)
        .fillColor("#1f2937")
        .text(paragraph, {
          align: "left",
          lineGap: 4
        });
      document.moveDown(0.9);
    });

    document
      .font("Helvetica-Oblique")
      .fontSize(9)
      .fillColor("#64748b")
      .text(`Seed asset generated for Closing Day demo - ${index + 1} / ${definition.pages.length}`, {
        align: "right"
      });
  });

  document.end();
  await finished(output);
}

export async function ensureSeedPdfs(): Promise<Record<SeedPdfAssetKey, SeedPdfAsset>> {
  const seedAssetsDirectory = path.resolve(process.cwd(), "seed-assets");
  await fs.promises.mkdir(seedAssetsDirectory, { recursive: true });

  const assets = {} as Record<SeedPdfAssetKey, SeedPdfAsset>;

  for (const definition of seedPdfDefinitions) {
    const targetPath = path.join(seedAssetsDirectory, definition.filename);
    if (!fs.existsSync(targetPath)) {
      await writePdf(definition, targetPath);
      logger.info("Generated seed PDF asset", {
        filename: definition.filename
      });
    }

    assets[definition.key] = {
      key: definition.key,
      filename: definition.filename,
      title: definition.title,
      category: definition.category,
      filePath: path.join("seed-assets", definition.filename).replaceAll("\\", "/"),
      textContent: buildTextContent(definition),
      summaryTlDr: definition.summaryTlDr,
      summaryJson: definition.summaryJson
    };
  }

  return assets;
}
