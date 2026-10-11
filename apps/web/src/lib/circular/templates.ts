/**
 * Circular templates.
 *
 * A template is a function that returns the starting blocks for one kind of
 * letter. It is only a STARTING point: once a circular is created its blocks
 * belong to that circular and can be rewritten freely; editing a template here
 * never changes a circular that already exists.
 *
 * To add a template: write a function returning blocks, and add it to
 * TEMPLATES. Use `{{tokens}}` (see tokens.ts) wherever the text repeats
 * something the activity, unit or settings already know.
 */

import type { Block, CircularContent, CircularContext } from "./types";
import { newBlockId } from "./types";

export type TemplateKey = "activity" | "camp" | "summer-camp" | "ceremony" | "blank";

export type Template = {
    key: TemplateKey;
    name: string;
    description: string;
    build: (ctx: CircularContext) => Block[];
};

// ─── Block helpers ────────────────────────────────────────────────────────────

const text = (label: string, body: string, align: "justify" | "left" | "center" = "justify"): Block =>
    ({ id: newBlockId(), type: "text", label, text: body, align });
const heading = (body: string): Block => ({ id: newBlockId(), type: "heading", label: "Boxed title", text: body });
const list = (label: string, items: string, marker: "none" | "dash" | "bullet", columns: 1 | 2 = 1): Block =>
    ({ id: newBlockId(), type: "list", label, items, marker, columns });
const pageBreak = (): Block => ({ id: newBlockId(), type: "pageBreak" });

// ─── Parts shared by several templates ────────────────────────────────────────

const confirmation = (): Block[] => [
    text("Confirmation", "We kindly ask you to confirm your {{child}}'s presence **by {{confirmBy}}** to one of the following:", "left"),
    { id: newBlockId(), type: "contacts", label: "Contact persons", source: "unit", custom: "" },
];

const signature = (): Block =>
    ({ id: newBlockId(), type: "signature", label: "Signature", text: "Scoutly Yours,\nMaîtrise {{unit}}", stamp: true });

const dropOffAndPickUp = (): Block => text(
    "Drop-off and pick-up",
    "We kindly ask that you drop off your {{child}} at {{startPlace}} at {{startTime}} sharp on the {{startDay}}, " +
    "and pick {{him}} up from {{endPlace}} at {{endTime}} on the {{endDay}}. " +
    "Please make sure that your {{child}} has {{his}} breakfast before coming."
);

const DEFAULT_PACKING_LIST = [
    "1 sleeping bag", "1 blanket", "1 small backpack", "1 cap", "Toothbrush and toothpaste",
    "1 small towel", "1 big towel", "Socks and underwear for every day",
    "T-shirts for every day and __2 white t-shirts__", "1 additional blue jeans", "Shorts",
    "1 sweater and 1 jacket", "1 flashlight & battery", "Empty laundry bags", "1 swimsuit",
    "YOUR GREAT MOOD !!!!",
].join("\n");

/** The page addressed to the children: what to pack and what to leave home. */
const packingPage = (ctx: CircularContext, occasion: string): Block[] => [
    pageBreak(),
    text(
        "Letter to the members",
        `Dear {{members}},\n\nWe are excited to see you at the ${occasion}! Below you may find the lists of items you should/should not bring.\n\n` +
        "Do not forget to come in the **tenue complète**: scout shirt with all the badges sewn, the scout belt, " +
        "blue jeans/SDL shorts, foulard promesse, beret, and a pen/pencil."
    ),
    heading("Items you **should NOT** bring :"),
    list("Not allowed", [
        "Food/Sweets and snacks",
        "Mobile, iPod, tablets and any electronic device",
        "Dangerous knives",
        "Journals, magazines, games",
        "Valuables (Jewelry, watches, etc.)",
        `Any object not related to the ${occasion}!`,
    ].join("\n"), "bullet"),
    heading("Items you **should** bring :"),
    // The activity's own "What to bring" wins when it was filled in; it stays a
    // live token so editing the activity updates the letter.
    list("Packing list", ctx.activity.whatToBring?.trim() ? "{{whatToBring}}" : DEFAULT_PACKING_LIST, "none", 2),
];

// ─── Templates ────────────────────────────────────────────────────────────────

const activity = (ctx: CircularContext): Block[] => [
    text(
        "Opening",
        "Dear Parents,\nWe are pleased to inform you about our upcoming activity, **{{title}}**:\n" +
        "> **Date:** {{dates}}\n> **Location:** {{location}}"
    ),
    text(
        "Drop-off and pick-up",
        "We kindly ask that you drop off your {{child}} at {{startPlace}} at {{startTime}} sharp, " +
        "and pick {{him}} up from {{endPlace}} at {{endTime}}."
    ),
    text("Fee", "The activity fee is {{fee}}.", "left"),
    ...(ctx.activity.whatToBring?.trim()
        ? [
            text("What to bring", "Please make sure that your {{child}} comes in full scout uniform and brings the following:", "left"),
            list("Items", "{{whatToBring}}", "dash"),
        ]
        : [text("Uniform", "Please make sure that your {{child}} comes in full scout uniform.", "left")]),
    ...confirmation(),
    signature(),
];

const camp = (ctx: CircularContext): Block[] => [
    text(
        "Opening",
        "Dear Parents,\nWe are writing to inform you about our upcoming **camp**:\n" +
        "> **Date:** {{dates}}\n> **Location:** {{location}}"
    ),
    dropOffAndPickUp(),
    text(
        "Fee and participation",
        "The camp fee is {{fee}}.\n" +
        "We would like to remind you that your {{child}}'s participation is **mandatory** for {{his}} personal growth. " +
        "**No reason, especially financial**, should prevent {{him}} from attending. " +
        "If there are any concerns, please don't hesitate to contact us."
    ),
    text("Notes", "Moreover, please note the following:\n" +
        "- It is mandatory that the {{children}} **attend the entire camp** from start till finish.\n" +
        "- To ensure the {{children}} fully experience the spirit of scouting without technological distractions, " +
        "mobile phones are not allowed. The Maîtrise will remain reachable in case anything should be communicated with us."),
    ...confirmation(),
    signature(),
    ...packingPage(ctx, "camp"),
];

const summerCamp = (ctx: CircularContext): Block[] => [
    text(
        "Opening",
        "Dear Parents,\nAs our scouts year {{scoutYear}} approaches its end, we are writing to inform you about our upcoming **summer camp**:\n" +
        "> **Date:** {{dates}}\n> **Location:** {{location}}"
    ),
    dropOffAndPickUp(),
    text(
        "Fee and participation",
        "The camp fee is {{fee}}.\n" +
        "We would like to remind you that your {{child}}'s participation is **mandatory** for {{his}} personal growth. " +
        "It's a valuable opportunity for {{him}} to share this adventure with {{his}} friends during the summer break. " +
        "**No reason, especially financial**, should prevent {{him}} from attending. " +
        "If there are any concerns, please don't hesitate to contact us."
    ),
    text("Notes", "Moreover, please note the following:\n" +
        "- It is mandatory that the {{children}} **attend the entire camp** from start till finish.\n" +
        "- The Maîtrise will be providing you with pictures of the {{children}} during the camp on the parents' WhatsApp group. " +
        "To ensure the {{children}} fully experience the spirit of scouting without technological distractions, " +
        "we will be available for communication between **8:00–9:00 a.m.** and **7:30–9:00 p.m.** in case anything should be communicated with us.\n" +
        "- Below you can find the invitation details to our **campfire**."),
    ...confirmation(),
    signature(),

    pageBreak(),
    heading("Campfire Invitation"),
    text(
        "Campfire invitation",
        "As previously mentioned, the camp will be held in {{location}}. Please note that visits will not be permitted during the duration of the camp.\n\n" +
        "Therefore, scoutmasters and members warmly invite you to join us for our campfire celebration on {{campfireDate}}, starting at {{campfireTime}}. " +
        "Come and share in the wonderful experiences and talents your children have gained during their time in nature. " +
        "We will begin with a Holy Mass, followed by an evening of fun, entertainment, and delightful surprises around the campfire.\n\n" +
        "For more comfort, we advise you to come in a **simple casual/sports outfit** (jeans, sweatpants, t-shirt, espadrilles, etc.)\n\n" +
        "The Scout Method has always taught us the value of **sharing**. If you would like to bring sweets or food, " +
        "we kindly ask that you hand them to a scoutmaster upon arrival. This way, we can distribute everything equally among all members, " +
        "reflecting the true spirit of Scouting. We also encourage everyone to keep in mind those whose parents may not be able to attend, " +
        "ensuring that no one feels left out.\n\n" +
        "**Parents, please note that after the campfire evening concludes, your child will not be returning home with you. " +
        "They will remain with us overnight and continue the camp program until the following day. Pickup will take place as scheduled.**\n\n" +
        "A location link will be shared with you soon via WhatsApp to help you reach us."
    ),
    ...packingPage(ctx, "summer camp"),
];

const ceremony = (): Block[] => [
    text(
        "Invitation",
        "Dear Parents,\nIt is with great joy that we invite you to **{{title}}**, an important moment in the scouting journey of your {{child}}:\n" +
        "> **Date:** {{startDate}}\n> **Time:** {{startTime}}\n> **Location:** {{location}}"
    ),
    text(
        "About the ceremony",
        "Your presence means a great deal to the {{children}}, who have been preparing for this day with enthusiasm. " +
        "We kindly ask you to arrive fifteen minutes early so that the ceremony can begin on time."
    ),
    text("Uniform", "The {{children}} are expected in the **tenue complète**.", "left"),
    text("After the ceremony", "The ceremony will be followed by a small gathering with the families.", "left"),
    ...confirmation(),
    signature(),
];

const blank = (): Block[] => [
    text("Letter", "Dear Parents,\n"),
    signature(),
];

export const TEMPLATES: Template[] = [
    { key: "activity", name: "Typical activity", description: "A meeting, day out or hike: date, place, drop-off and pick-up, fee, who to confirm with.", build: activity },
    { key: "camp", name: "Camp", description: "A camp of a few days, with the participation reminder and a packing list for the members.", build: camp },
    { key: "summer-camp", name: "Summer camp", description: "The full three-page letter: camp details, campfire invitation for parents, and the packing list.", build: summerCamp },
    { key: "ceremony", name: "Ceremony invitation", description: "Invites the parents to a promise, a passage or any other ceremony.", build: ceremony },
    { key: "blank", name: "Blank letter", description: "Just the letterhead, the reference and a signature. Write the rest yourself.", build: blank },
];

export const TEMPLATE_BY_KEY: Record<string, Template> = Object.fromEntries(TEMPLATES.map(t => [t.key, t]));

export function isTemplateKey(key: unknown): key is TemplateKey {
    return typeof key === "string" && key in TEMPLATE_BY_KEY;
}

/** The template an activity most likely wants, to pre-select in the picker. */
export function recommendTemplate(activity: CircularContext["activity"]): TemplateKey {
    if (activity.activityType !== "CAMP") return "activity";
    const start = new Date(activity.startDate);
    const end = activity.endDate ? new Date(activity.endDate) : start;
    const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
    const month = start.getUTCMonth() + 1;
    return days >= 4 && month >= 6 && month <= 9 ? "summer-camp" : "camp";
}

/** A new circular's content, straight from a template. */
export function contentFromTemplate(key: TemplateKey, ctx: CircularContext): CircularContent {
    return {
        version: 1,
        showReference: true,
        theme: "\"{{theme}}\"",
        dateline: "{{city}}, {{issueDate}}",
        footerLeft: "{{motto}}",
        footerRight: "{{scoutYear}}",
        values: {},
        blocks: TEMPLATE_BY_KEY[key].build(ctx),
    };
}
