import type { CHATBOT_INCIDENT_TYPES } from './contracts';

type IncidentType = typeof CHATBOT_INCIDENT_TYPES[number];
type LanguageStyle = 'en' | 'fil' | 'taglish';

/**
 * Reviewed, non-clinical material distilled from Chatbot-4.md.
 *
 * The markdown source is never loaded at runtime. Its three first-aid scripts
 * are intentionally excluded pending written CDRRMO/clinical approval.
 */
export const CHATBOT_4_REPORTING_GUIDE = {
  id: 'chatbot-4-reporting-guide',
  source: 'Chatbot-4.md' as const,
  keywords: [
    'what should i do', 'what do i do', 'what should i do next', 'what are the steps',
    'how do i report', 'how to report', 'how do i submit a report', 'how do i make a report',
    'how do i start', 'where do i start', 'guide me', 'help me report',
    'what do i need to fill out', 'what information do i need', 'how does reporting work',
    'what is the reporting process', 'how can i request emergency help', 'how do i fill out the form',
    'ano gagawin ko', 'anong gagawin ko', 'ano dapat kong gawin', 'ano ang mga steps',
    'ano ang proseso', 'paano magsimula', 'paano ako mag-report', 'paano mag-report',
    'paano mag-submit', 'turuan mo ako', 'gabayan mo ako', 'tulungan mo akong mag-report',
    'ano una kong gagawin', 'ano ang susunod kong gagawin', 'ano next step', 'anong next step',
    'ano next', 'paano ba', 'pano ba', 'pano mag-report', 'pa-guide', 'paturo',
    'di ko alam gagawin', 'hindi ko alam ano gagawin', 'ano pipindutin ko', 'ano muna gagawin',
    'ano sunod', 'anong sunod', 'what do i fill up', 'ano i-fill up ko', 'ano mga need ilagay',
  ],
  answers: {
    guest: {
      en: 'To report an emergency, take a clear incident photo, choose the incident type, enter a valid callback number, capture your GPS location and a nearby landmark, enter the exact number of people involved and their condition, then review and submit. Tap Start incident report when you are ready.',
      fil: 'Para mag-report ng emergency, kumuha ng malinaw na litrato, piliin ang uri ng insidente, maglagay ng wastong callback number, kunin ang GPS location at kalapit na palatandaan, ilagay ang eksaktong bilang at kalagayan ng mga sangkot, saka suriin at ipadala ang ulat. Pindutin ang Start incident report kapag handa ka na.',
      taglish: 'Para mag-report, kumuha ng clear incident photo, piliin ang incident type, maglagay ng valid callback number, i-capture ang GPS location at nearby landmark, ilagay ang exact number at condition ng mga involved, then review and submit. Tap Start incident report kapag ready ka na.',
    },
    registered: {
      en: 'To report an emergency, take a clear incident photo, choose the incident type, capture your GPS location, enter the exact number of people involved and their condition, then review and submit. Your verified account contact is used automatically; a nearby landmark is optional. Tap Start incident report when you are ready.',
      fil: 'Para mag-report ng emergency, kumuha ng malinaw na litrato, piliin ang uri ng insidente, kunin ang GPS location, ilagay ang eksaktong bilang at kalagayan ng mga sangkot, saka suriin at ipadala ang ulat. Awtomatikong ginagamit ang beripikadong contact ng account at opsyonal ang kalapit na palatandaan. Pindutin ang Start incident report kapag handa ka na.',
      taglish: 'Para mag-report, kumuha ng clear incident photo, piliin ang incident type, i-capture ang GPS location, ilagay ang exact number at condition ng mga involved, then review and submit. Automatically used ang verified account contact at optional ang nearby landmark. Tap Start incident report kapag ready ka na.',
    },
  } satisfies Record<'guest' | 'registered', Record<LanguageStyle, string>>,
};

export const CHATBOT_4_TRIAGE_ALIASES: ReadonlyArray<{ incidentType: IncidentType; nature: 'EMERGENCY' | 'NON-EMERGENCY'; phrases: readonly string[] }> = [
  { incidentType: 'Vehicular Collision', nature: 'EMERGENCY', phrases: ['tumaob yung motor', 'tumagilid yung sasakyan', 'sumalpok yung sasakyan', 'bumangga sa poste', 'may naipit sa sasakyan', 'road accident', 'motorcycle crash', 'two vehicles collided'] },
  { incidentType: 'Fire Emergency', nature: 'EMERGENCY', phrases: ['makapal yung usok', 'nagliyab yung outlet', 'hindi namin mapatay yung apoy'] },
  { incidentType: 'Medical Emergency', nature: 'EMERGENCY', phrases: ['injured ako', 'parang inaatake siya', 'nangingisay siya', 'nagse-seizure siya', 'nabulunan siya', 'choking siya', 'namamaga yung mukha niya', 'may allergic reaction siya', 'hindi niya maigalaw katawan niya', 'biglang namutla', 'sobrang nanghihina siya', 'parang mahihimatay ako', 'may malalim na sugat', 'napaso siya', 'nakagat siya ng ahas', 'may buntis na nangangailangan ng emergency help', 'someone is choking', 'i need urgent medical attention'] },
  { incidentType: 'Structural Failure', nature: 'EMERGENCY', phrases: ['bumagsak yung kisame', 'bumigay yung bubong', 'may malaking crack sa pader', 'may bitak yung building', 'may debris na bumagsak', 'may na-trap sa loob'] },
  { incidentType: 'Flood/Water', nature: 'EMERGENCY', phrases: ['pumasok na yung tubig sa bahay', 'na-stranded kami sa baha', 'hindi kami makalabas dahil sa baha', 'may taong inanod', 'lubog na yung kalsada', 'tumataas pa yung tubig', 'need rescue sa baha'] },
  { incidentType: 'Unknown Cause', nature: 'NON-EMERGENCY', phrases: ['may nangyari dito pero hindi namin alam kung ano', 'di namin alam anong nangyari', 'unknown yung cause', 'may unusual situation dito', 'please check the situation'] },
  { incidentType: 'Patient Transport', nature: 'NON-EMERGENCY', phrases: ['kailangan ng patient transport', 'kailangan namin ng ambulance for transport', 'may patient na kailangang ihatid', 'need dalhin yung patient sa hospital', 'need transfer sa ibang hospital', 'kailangan ilipat yung patient', 'need ambulance papuntang hospital', 'need transport for a patient', 'patient needs transportation', 'we need an ambulance for hospital transfer', 'kailangan sunduin yung patient', 'may bedridden patient na kailangang dalhin sa hospital'] },
  // General questions alone remain fallbacks. These phrases explicitly state a non-emergency request.
  { incidentType: 'Other / non-emergency request', nature: 'NON-EMERGENCY', phrases: ['need assistance pero hindi emergency', 'hindi naman emergency pero need namin ng help', 'i have a non-emergency concern'] },
];
