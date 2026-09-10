import {
  CHATBOT_CONDITIONS,
  CHATBOT_INCIDENT_TYPES,
  type ChatbotRespondRequest,
  type ChatbotResponse,
  parseExactPeopleCount,
} from '@/lib/chatbot/contracts';
import { findKnowledge, getKnowledgeAnswer } from '@/lib/chatbot/knowledge';

type LanguageStyle = 'en' | 'fil' | 'taglish';
type Slot = NonNullable<ChatbotRespondRequest['draft']['pendingSlot']>;

const SLOT_PROMPTS: Record<LanguageStyle, Record<Slot, string>> = {
  en: {
    evidence: 'Please take and attach clear photo evidence when it is safe. Evidence is required before a report can be sent.',
    incidentType: 'What happened? Please choose one incident type.',
    contactNumber: 'What Philippine mobile number can PACC use to contact you?',
    location: 'Please capture your current GPS location and add a nearby landmark.',
    peopleInvolved: 'How many people are involved? Please type one exact whole number from 1 to 999, for example, 3.',
    victimCondition: 'What is the victim’s condition? Please choose the closest option.',
    review: 'Please review the report details, then submit only when they are correct.',
  },
  fil: {
    evidence: 'Kumuha at maglakip ng malinaw na litrato kung ligtas gawin. Kailangan ang ebidensiya bago maipadala ang ulat.',
    incidentType: 'Ano ang nangyari? Pumili ng isang uri ng insidente.',
    contactNumber: 'Anong Philippine mobile number ang maaaring tawagan ng PACC?',
    location: 'Kunin ang kasalukuyang GPS location at maglagay ng kalapit na palatandaan.',
    peopleInvolved: 'Ilang tao ang sangkot? Mag-type ng isang eksaktong buong bilang mula 1 hanggang 999, halimbawa 3.',
    victimCondition: 'Ano ang kalagayan ng biktima? Piliin ang pinakamalapit na sagot.',
    review: 'Suriin ang lahat ng detalye at ipadala lamang kapag tama ang mga ito.',
  },
  taglish: {
    evidence: 'Please kumuha at mag-attach ng malinaw na photo evidence kapag ligtas. Required ito bago maipadala ang report.',
    incidentType: 'Ano ang nangyari? Please choose one incident type.',
    contactNumber: 'Anong Philippine mobile number ang puwedeng tawagan ng PACC?',
    location: 'Please capture your GPS location at maglagay ng nearby landmark.',
    peopleInvolved: 'Ilang tao ang involved? Type one exact whole number from 1 to 999, halimbawa 3.',
    victimCondition: 'Ano ang condition ng victim? Piliin ang closest option.',
    review: 'Please review all report details at mag-submit lamang kapag tama ang mga ito.',
  },
};

const RESPONSE_COPY = {
  en: {
    cancelSubmitted: 'Your submitted report can only be cancelled while it is still pending and has no active incident. Please confirm cancellation in the report card.',
    cancelDraft: 'Your draft has not been sent. Please confirm if you want to discard it.',
    realTime: 'I do not have verified real-time information for that question. Please follow official Baliwag CDRRMO advisories.',
    startCaptured: 'I captured the incident details you provided. Please confirm that you want to start a report.',
    startEmpty: 'I can help you make a report. Please confirm and I will guide you one step at a time.',
    slotsRecorded: 'I recorded the report details you provided. Please continue with the remaining required information.',
    countRequired: 'Please send one exact whole number from 1 to 999. I cannot use a range such as 2-5.',
    fallback: 'I can only help with DisasTRACE, incident reporting, approved emergency safety, disaster preparedness, and Baliwag CDRRMO information.',
  },
  fil: {
    cancelSubmitted: 'Makakansela lamang ang naipadalang ulat habang pending pa at wala pang aktibong insidente. Kumpirmahin sa report card.',
    cancelDraft: 'Hindi pa naipapadala ang draft. Kumpirmahin kung gusto mo itong burahin.',
    realTime: 'Wala akong beripikadong real-time na impormasyon para rito. Sundin ang opisyal na Baliwag CDRRMO advisories.',
    startCaptured: 'Nakuha ko ang ibinigay mong detalye. Kumpirmahin kung gusto mong magsimula ng ulat.',
    startEmpty: 'Matutulungan kitang gumawa ng ulat. Kumpirmahin at gagabayan kita paisa-isang hakbang.',
    slotsRecorded: 'Naitala ko ang mga detalye. Ipagpatuloy ang natitirang kailangang impormasyon.',
    countRequired: 'Magpadala ng isang eksaktong buong bilang mula 1 hanggang 999. Hindi maaaring gumamit ng range gaya ng 2-5.',
    fallback: 'Makakatulong lamang ako tungkol sa DisasTRACE, pag-uulat ng insidente, aprubadong emergency safety, disaster preparedness, at Baliwag CDRRMO.',
  },
  taglish: {
    cancelSubmitted: 'Makakansela lang ang submitted report habang pending at wala pang active incident. Please confirm sa report card.',
    cancelDraft: 'Hindi pa nasend ang draft. Please confirm kung gusto mo itong i-discard.',
    realTime: 'Wala akong verified real-time information para rito. Please follow official Baliwag CDRRMO advisories.',
    startCaptured: 'Nakuha ko ang incident details na ibinigay mo. Please confirm kung gusto mong magsimula ng report.',
    startEmpty: 'Matutulungan kitang gumawa ng report. Please confirm at gagabayan kita step by step.',
    slotsRecorded: 'Naitala ko ang report details. Please continue sa natitirang required information.',
    countRequired: 'Please send one exact whole number from 1 to 999. Hindi puwedeng range gaya ng 2-5.',
    fallback: 'Makakatulong lang ako sa DisasTRACE, incident reporting, approved emergency safety, disaster preparedness, at Baliwag CDRRMO information.',
  },
} satisfies Record<LanguageStyle, Record<string, string>>;

const REAL_TIME_PATTERN = /\b(right now|currently|live|latest|today|ngayon|available now|availability|weather now|flooding now)\b/i;
const REPORT_WORDS = /\b(report|emergency|mag-report|ireport|i-report|aksidente|sakuna|tulong)\b/i;

function detectLanguage(message: string, hint?: LanguageStyle): LanguageStyle {
  if (hint) return hint;
  const hasFilipino = /\b(ano|ang|mga|may|baha|bagyo|lindol|sunog|tulong|po|kailangan|tao|walang malay)\b/i.test(message);
  const hasEnglish = /\b(what|please|report|help|people|fire|flood|patient)\b/i.test(message);
  return hasFilipino ? (hasEnglish ? 'taglish' : 'fil') : 'en';
}

function baseResponse(languageStyle: LanguageStyle): Pick<ChatbotResponse, 'languageStyle' | 'slotUpdates' | 'shouldStartDraft' | 'resumePending' | 'providerFallback'> {
  return { languageStyle, slotUpdates: {}, shouldStartDraft: false, resumePending: false, providerFallback: false };
}

function resumePrompt(request: ChatbotRespondRequest, languageStyle: LanguageStyle) {
  return request.mode === 'DRAFT' && request.draft.pendingSlot
    ? ` ${SLOT_PROMPTS[languageStyle][request.draft.pendingSlot]}`
    : '';
}

function extractIncidentType(message: string): typeof CHATBOT_INCIDENT_TYPES[number] | undefined {
  if (/\b(patient transport|transport patient|hospital transfer)\b/i.test(message)) return 'Patient Transport';
  if (/\b(non[- ]?emergency|other request|general assistance)\b/i.test(message)) return 'Other / non-emergency request';
  if (/\b(minor medical|medical|ambulance|injur(?:y|ed)|sick|nahimatay)\b/i.test(message)) return 'Medical Emergency';
  if (/\b(fire|sunog|nasusunog)\b/i.test(message)) return 'Fire Emergency';
  if (/\b(crash|collision|vehicular|car accident|bangga|aksidente sa sasakyan)\b/i.test(message)) return 'Vehicular Collision';
  if (/\b(structural|collapse|collapsed|building damage|gumuho|guho)\b/i.test(message)) return 'Structural Failure';
  if (/\b(flood|flooding|baha|water rescue)\b/i.test(message)) return 'Flood/Water';
  return undefined;
}

function extractPeopleCount(message: string): number | undefined {
  const digitMatch = message.match(/\b(\d{1,3})\s*(?:people|persons?|victims?|tao)\b/i);
  if (digitMatch) return parseExactPeopleCount(digitMatch[1]) ?? undefined;
  const wordMatch = message.match(/\b(one|isa|two|dalawa|three|tatlo|four|apat|five|lima|six|anim|seven|pito|eight|walo|nine|siyam|ten|sampu)\s+(?:people|persons?|victims?|tao)\b/i);
  return wordMatch ? parseExactPeopleCount(wordMatch[1]) ?? undefined : undefined;
}

function extractCondition(message: string): typeof CHATBOT_CONDITIONS[number] | undefined {
  if (/\b(unconscious|not responsive|unresponsive|critical|walang malay)\b/i.test(message)) return 'Unconscious / critical';
  if (/\b(unstable|seriously injured|malubha)\b/i.test(message)) return 'Conscious and unstable';
  if (/\b(stable|responsive|conscious)\b/i.test(message)) return 'Conscious and stable';
  if (/\b(no injur(?:y|ies)|not injured|safe)\b/i.test(message)) return 'No injuries reported';
  if (/\b(not sure|unknown|cannot assess|hindi alam)\b/i.test(message)) return 'Unknown / cannot assess';
  return CHATBOT_CONDITIONS.find((condition) => message.toLowerCase().includes(condition.toLowerCase()));
}

function extractReportSlots(message: string): ChatbotResponse['slotUpdates'] {
  const incidentType = extractIncidentType(message);
  const isNonEmergency = incidentType === 'Patient Transport'
    || incidentType === 'Other / non-emergency request'
    || incidentType === 'Unknown Cause';
  const peopleInvolved = extractPeopleCount(message);
  const victimCondition = extractCondition(message);
  return {
    ...(incidentType ? { incidentType } : {}),
    ...(incidentType ? { nature: isNonEmergency ? 'NON-EMERGENCY' as const : 'EMERGENCY' as const } : {}),
    ...(peopleInvolved ? { peopleInvolved } : {}),
    ...(victimCondition ? { victimCondition } : {}),
  };
}

export function deterministicChatbotResponse(request: ChatbotRespondRequest): ChatbotResponse {
  const message = request.message.trim();
  const languageStyle = detectLanguage(message, request.languageHint);
  const defaults = baseResponse(languageStyle);
  const copy = RESPONSE_COPY[languageStyle];
  const pendingSlot = request.draft.pendingSlot;

  if (/\b(cancel|stop|huwag na|ayoko na)\b/i.test(message)) {
    const submitted = request.mode === 'SUBMITTED_PENDING';
    return {
      ...defaults,
      reply: submitted ? copy.cancelSubmitted : copy.cancelDraft,
      replyKey: submitted ? 'cancel-submitted-confirmation' : 'cancel-draft-confirmation',
      action: submitted ? 'CANCEL_SUBMITTED' : 'CANCEL_DRAFT',
      nextSlot: pendingSlot,
      resumePending: Boolean(pendingSlot),
    };
  }

  if (REAL_TIME_PATTERN.test(message)) {
    return {
      ...defaults,
      reply: `${copy.realTime}${resumePrompt(request, languageStyle)}`,
      replyKey: 'real-time-unavailable',
      action: 'FALLBACK',
      nextSlot: pendingSlot,
      resumePending: Boolean(pendingSlot),
    };
  }

  // Knowledge questions take priority over a pending answer slot so users can
  // briefly ask for help and then return to the exact unanswered question.
  const knowledge = findKnowledge(message);
  if (knowledge && (request.mode !== 'DRAFT' || knowledge.allowDuringDraft)) {
    return {
      ...defaults,
      reply: `${getKnowledgeAnswer(knowledge, languageStyle)}${resumePrompt(request, languageStyle)}`,
      replyKey: knowledge.id,
      action: 'ANSWER_CONTEXT',
      nextSlot: pendingSlot,
      resumePending: Boolean(pendingSlot),
    };
  }

  const slotUpdates = extractReportSlots(message);
  const hasExtractedSlot = Object.keys(slotUpdates).length > 0;
  if (request.mode === 'IDLE' && (REPORT_WORDS.test(message) || hasExtractedSlot)) {
    return {
      ...defaults,
      reply: hasExtractedSlot ? copy.startCaptured : copy.startEmpty,
      replyKey: 'start-report',
      action: 'START_REPORT',
      slotUpdates,
      nextSlot: 'evidence',
      shouldStartDraft: true,
    };
  }

  if (request.mode === 'DRAFT' && pendingSlot === 'peopleInvolved' && slotUpdates.peopleInvolved) {
    const count = slotUpdates.peopleInvolved;
    const reply = languageStyle === 'en'
      ? `Thanks. I recorded exactly ${count} ${count === 1 ? 'person' : 'people'}.`
      : languageStyle === 'fil'
        ? `Salamat. Naitala ko ang eksaktong bilang na ${count} ${count === 1 ? 'tao' : 'katao'}.`
        : `Salamat. I recorded exactly ${count} ${count === 1 ? 'person' : 'people'}.`;
    return {
      ...defaults,
      reply,
      replyKey: 'people-count-recorded',
      action: 'FILL_SLOTS',
      slotUpdates,
      nextSlot: 'victimCondition',
    };
  }

  if (request.mode === 'DRAFT' && hasExtractedSlot) {
    return {
      ...defaults,
      reply: copy.slotsRecorded,
      replyKey: 'report-slots-recorded',
      action: 'FILL_SLOTS',
      slotUpdates,
      nextSlot: pendingSlot,
    };
  }

  if (pendingSlot === 'peopleInvolved') {
    const count = parseExactPeopleCount(message);
    if (count !== null) {
      const reply = languageStyle === 'en'
        ? `Thanks. I recorded exactly ${count} ${count === 1 ? 'person' : 'people'}.`
        : languageStyle === 'fil'
          ? `Salamat. Naitala ko ang eksaktong bilang na ${count} ${count === 1 ? 'tao' : 'katao'}.`
          : `Salamat. I recorded exactly ${count} ${count === 1 ? 'person' : 'people'}.`;
      return {
        ...defaults,
        reply,
        replyKey: 'people-count-recorded',
        action: 'FILL_SLOTS',
        slotUpdates: { peopleInvolved: count },
        nextSlot: 'victimCondition',
      };
    }
    return {
      ...defaults,
      reply: copy.countRequired,
      replyKey: 'people-count-required',
      action: 'CONTINUE_REPORT',
      nextSlot: 'peopleInvolved',
    };
  }

  return {
    ...defaults,
    reply: `${copy.fallback}${resumePrompt(request, languageStyle)}`,
    replyKey: 'out-of-context',
    action: 'FALLBACK',
    nextSlot: pendingSlot,
    resumePending: Boolean(pendingSlot),
  };
}

export function chatbotSlotPrompt(slot: Slot, languageStyle: LanguageStyle): string {
  return SLOT_PROMPTS[languageStyle][slot];
}
