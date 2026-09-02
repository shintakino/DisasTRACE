# **DisasTRACE Chatbot Scenario & Response Library**

# **1.0 GENERAL CHATBOT FLOW**

The chatbot has two reporting modes:

# **1.1 Guest Mode**

The user is not logged in.

The chatbot needs to collect:

- Photo / Evidence

- What happened

- Exact Location / GPS

- Landmark or location details

- Number of people affected

- Condition of victim/s, when applicable

- Contact Number

# **1.2 User Mode**

The user is logged in.

The chatbot can already access the user's:

- Registered contact number

- Registered address / account information

- Available location information

Therefore, the chatbot should **not ask for the user's phone number or landmark again** unless the user provides a different contact number or specifically indicates that the incident location is different from their registered information.

The chatbot should focus on:

- Photo / Evidence

- What happened

- Exact Incident Location / GPS

- Number of people affected, when applicable

- Condition of victim/s, when applicable

# **2.0 START OF REPORT**

# **2.1 Guest Mode — Initial Greeting**

# **Chatbot:**

Hello! Welcome to DisasTRACE. I’m here to help you report an incident. Please take a photo of the incident or surrounding area to begin.

# **Button:**

# **Take Photo**

After photo:

Thank you. Your photo has been captured. Please tell me what happened.

# **Buttons:**

- Fire

- Vehicular Accident

- Medical Emergency

- Structural Failure

- Flood / Water

- Patient Transport

- Minor Medical Complaint

- Other

The user may also type their own description instead of selecting a button.

# **2.2 User Mode — Initial Greeting**

# **Chatbot:**

Hello! Welcome back to DisasTRACE. Please take a photo of the incident or surrounding area to begin.

# **Button:**

# **Take Photo**

After photo:

Thank you. Your photo has been captured. Please tell me what happened.

The chatbot should already use the user's account information and should **not ask for their phone number or landmark** .

# **3.0 EMERGENCY — FIRE EMERGENCY**

# **3.1 Guest Mode — Button Selection**

# **User chooses:**

# **Fire**

# **Chatbot:**

I understand. You’re reporting a fire. Please provide the exact location or use your current location.

# **Buttons:**

- Use Current Location

- Enter Location Manually

After location:

Are there any people affected, injured, or trapped?

# **Buttons:**

- Yes

- No

- Not Sure

If Yes:

How many people are affected?

# **Buttons:**

- 1

- 2–5

- 6–10

- More than 10

- Not Sure

# Then:

What is the current condition of the affected person/s?

# **Buttons:**

- Conscious / Responsive

- Injured

- Seriously Injured

- Unconscious / Not Responsive

- Trapped

- Not Sure

- Other

# Then:

Please provide a contact number where responders can reach you. (Submit after giving contact number)

# **3.2 User Mode — Button Selection**

# **User chooses:**

# **Fire**

# **Chatbot:**

I understand. You’re reporting a fire. Please provide the exact incident location or use your current location.

# **Buttons:**

- Use Current Location

# ● Enter Location Manually

The chatbot does **not** ask for:

● Contact number

- Landmark

because these are already available from the user's account.

Then:

Are there any people affected, injured, or trapped?

Continue based on the user's answer.

# **3.3 Fire — Typed Responses**

Possible user messages:

May sunog dito.

Nasusunog yung bahay namin.

May apoy sa building.

May nasusunog na tindahan.

There’s a fire near us.

May fire po sa bahay namin.

May umaapoy na kotse

Malakas na ang apoy sa may subdivision

May sunog po malapit sa palengke.

Tulong, nasusunog ang katabing bahay!

Kumakalat na ang apoy dito sa lugar namin.

Nakakakita ako ng makapal na usok mula sa factory.

May sumabog at biglang nagkaapoy dito.

There is a huge fire breaking out down the street.

Help, my kitchen is caught on fire!

I can see heavy black smoke coming from the warehouse.

The building next door is completely up in flames. Please send a firetruck immediately, there is a fire here. Sunog Nasusunog yung poste ng kuryente May malaking sunog po sa kabilang kalsada. Nasusunog na ang bubong ng kapitbahay namin. May apoy na lumalabas sa loob ng gusali. Lumalaki na po ang apoy, kailangan ng tulong. May nasusunog na sasakyan sa kalsada. Makapal ang usok at may apoy sa may garahe. Nagliyab bigla ang isang bahagi ng bahay. May sunog sa isang apartment dito. Mukhang may nasusunog sa loob ng establishment.

Kailangan po namin ng bumbero, may malaking apoy dito. There is a fire inside the building.

Flames are spreading quickly in this area. A house nearby has caught fire. We need firefighters here immediately. There is a vehicle on fire on the road.

Smoke and flames are coming from the garage.

A fire has started in the apartment.

The fire is getting bigger and spreading.

There appears to be a fire inside the establishment.

Emergency! Please send firefighters to this location.

# **Expected chatbot:**

I understand. You’re reporting a fire. Please provide the exact incident location or use your current location.

# **4.0 EMERGENCY — VEHICULAR COLLISION**

# **4.1 Guest Mode**

# **User chooses:**

# **Vehicular Accident**

# **Chatbot:**

I understand. You’re reporting a vehicular collision. Please provide the exact location or use your current location.

# **Buttons:**

- Use Current Location

- Enter Location Manually

Then:

Are there any injured or trapped people?

# **Buttons:**

- Yes

- No

● Not Sure

If Yes:

How many people are affected?

# **Buttons:**

- 1

- 2–5

- 6–10

- More than 10

- Not Sure

Then:

What is the current condition of the affected person/s?

# **Buttons:**

● Conscious / Responsive

- Injured

- Seriously Injured

- Unconscious / Not Responsive

- Trapped

- Not Sure

- Other

Then:

Please provide a contact number where responders can reach you.

# **4.2 User Mode**

# **User chooses:**

**Vehicular Accident**

**Chatbot:**

I understand. You’re reporting a vehicular collision. Please provide the exact incident location or use your current location.

The chatbot does not ask for the user's phone number or landmark.

Then continue with affected people and condition only when relevant.

# **4.3 Vehicular Collision — Typed Responses**

Possible inputs:

May nagbanggaan.

May accident dito.

Naaksidente yung motor.

Dalawang kotse nagbanggaan.

May collision sa highway.

May banggaan sa intersection.

Two cars crashed.

There has been a car accident here.

A motorcycle crashed into a car.

Three vehicles have collided.

There is a crash on the main road.

A vehicle has hit a pole.

Two motorcycles collided.

There is an accident at the intersection.

A truck collided with a car.

There has been a collision on the highway.

A vehicle crashed into a barrier. There is a road accident near our location.

Multiple vehicles have crashed.

A car and a motorcycle collided.

There is a serious traffic accident here. Please send help, there has been a vehicle collision. May malaking banggaan dito sa kalsada. Tatlong sasakyan ang nagbanggaan. May motor na bumangga sa kotse. May aksidente sa may intersection. May sasakyang bumangga sa poste. Nagkabanggaan ang dalawang motor. May jeep at kotse na nagbanggaan. May banggaan sa gitna ng highway. Naaksidente ang isang sasakyan sa kalsada.

May truck na bumangga sa kotse.

May aksidente malapit sa amin.

May sasakyang tumama sa barrier.

Bumangga ang motor sa isa pang sasakyan.

May malubhang banggaan sa pangunahing kalsada.

# **Expected:**

I understand. You’re reporting a vehicular collision/ incident. Please provide the exact incident location or use your current location.

# **5.0 EMERGENCY — MEDICAL EMERGENCY**

# **5.1 Guest Mode**

# **User chooses:**

# **Medical Emergency**

# **Chatbot:**

I understand. You’re reporting a medical emergency. Please provide the exact location or use your current location.

Then:

What is the current condition of the person?

# **Buttons:**

- Conscious / Responsive

- Injured

- Seriously Injured

- Unconscious / Not Responsive

- Not Breathing

- Other

- Not Sure

# Then:

How many people need assistance?

# **Buttons:**

- 1

- 2–5

- 6–10

- More than 10

- Not Sure

# Then:

Please provide a contact number where responders can reach you.

# **5.2 User Mode**

# **User chooses:**

# **Medical Emergency**

# **Chatbot:**

I understand. You’re reporting a medical emergency. Please provide the exact incident location or use your current location.

The chatbot does not ask for:

- Contact number

- Landmark

Then ask only for the victim's condition and number of affected people.

# **5.3 Medical Emergency — Typed Responses**

Possible inputs:

May nahimatay.

May taong hindi humihinga.

May nasugatan dito.

Someone is unconscious.

May biglang bumagsak. Need medical help.

May nangangailangan ng ambulance.

May nabagok dito humapas yung ulo sa kantuhan ng mesa

May taong biglang nawalan ng malay.

Hindi magising yung tao.

May nahulog at nasaktan.

May biglang nag-collapse dito.

Kailangan ng agarang tulong medikal.

May taong hirap huminga.

May matinding pananakit at nangangailangan ng tulong.

May pasyenteng kailangang dalhin sa ospital.

Kailangan namin ng ambulansya agad.

May taong nanghihina at hindi makatayo.

May emergency medical situation dito.

May taong biglang nagkasakit.

May nasaktan sa aksidente at kailangan ng tulong.

May taong hindi maayos ang pakiramdam at nangangailangan ng medical assistance.

Someone suddenly collapsed.

A person is having difficulty breathing.

Someone needs immediate medical attention.

Please send an ambulance.

A person has fallen and needs medical help.

Someone is not responding.

There is a person who needs urgent medical assistance.

We need emergency medical responders here.

Someone is feeling very weak and cannot stand.

A person needs to be taken to the hospital.

There is a medical emergency at this location.

Someone suddenly became very ill.

Please send medical assistance immediately.

A person was injured and needs help.

We need an ambulance as soon as possible.

# **Expected:**

I understand. You’re reporting a medical emergency. Please provide the exact incident location or use your current location.

If the user already provides the condition:

May taong nahimatay at hindi nagre-respond.

# **Expected:**

I understand. You’re reporting a medical emergency involving an unresponsive person. Please provide the exact incident location or use your current location.

Do not ask for the condition again.

# **6.0 EMERGENCY — STRUCTURAL FAILURE**

# **6.1 Guest Mode**

# **User chooses:**

# **Structural Failure**

# **Chatbot:**

I understand. You’re reporting a structural failure. Please provide the exact location or use your current location.

Then:

Is anyone injured or trapped inside or near the affected structure?

# **Buttons:**

- Yes

- No

- Not Sure

If Yes:

How many people are affected?

Then:

What is their current condition?

# **Buttons:**

- Conscious / Responsive

- Injured

- Seriously Injured

- Unconscious / Not Responsive

- Trapped

- Not Sure

- Other

Then:

Please provide a contact number where responders can reach you.

# **6.2 User Mode**

# **Chatbot:**

I understand. You’re reporting a structural failure. Please provide the exact incident location or use your current location.

No contact number or landmark question.

Then continue with affected people and condition.

# **6.3 Structural Failure — Typed Responses**

Gumuho yung building.

Bumagsak yung pader. Gumuho yung bahay. The roof collapsed. May mga taong trapped sa loob. May part ng building na bumagsak. May bahagi ng gusali na gumuho. May bumigay na bahagi ng building. Gumuho ang isang bahagi ng pader. Bumagsak ang bubong ng establishment. May gusaling mukhang malapit nang gumuho. Nagkaroon ng pagguho sa loob ng building. Bumigay ang poste ng isang gusali. May bahagi ng bahay na biglang bumagsak. Gumuho ang isang lumang gusali. May mga debris na bumagsak mula sa building. Bumigay ang kisame at may mga taong nasa loob.

May structure na nasira at maaaring bumagsak. May bahagi ng tulay na bumigay. Kailangan ng rescue, may gumuho na structure dito. Part of the building has collapsed.

A wall has suddenly fallen down.

The ceiling has collapsed.

The structure is starting to collapse.

A portion of the house has fallen.

There are people trapped inside the collapsed structure.

The building appears unstable and may collapse.

Debris has fallen from the building.

Part of the roof has caved in.

A section of the bridge has collapsed.

The building has suffered structural damage.

A structure has partially collapsed.

The support beam has failed.

Please send rescue personnel, a structure has collapsed.

There is a dangerous building collapse at this location.

# **Expected:**

I understand. You’re reporting a structural failure. Please provide the exact incident location or use your current location.

# **7.0 EMERGENCY — FLOOD / WATER**

# **7.1 Guest Mode**

# **Chatbot:**

I understand. You’re reporting a flood or water-related incident. Please provide the exact location or use your current location.

Then:

Are there people currently affected, trapped, or unable to evacuate?

# **Buttons:**

- Yes

- No

- Not Sure

If Yes:

Approximately how many people are affected?

Then:

What is their current condition?

# **Buttons:**

- Safe / Not Injured

- Injured

- Trapped

- Unconscious / Not Responsive

- Not Sure

- Other

Then collect contact number.

# **7.2 User Mode**

# **Chatbot:**

I understand. You’re reporting a flood or water-related incident. Please provide the exact incident location or use your current location.

No contact number or landmark question.

# **7.3 Flood / Water — Typed Responses**

Baha dito.

Binabaha kami.

Mataas na yung tubig.

May mga stranded dahil sa baha. May mga taong trapped sa baha. Flooding sa barangay namin. The water is rising quickly.

Tulong may nalulunod Lumalalim na ang baha dito. Hanggang tuhod na ang tubig sa kalsada. Pumasok na ang baha sa bahay namin.

Mabilis na tumataas ang tubig.

Hindi na madaanan ang kalsada dahil sa baha.

May mga sasakyang na-stranded sa baha.

May taong nangangailangan ng rescue sa binahang lugar. Umabot na sa loob ng mga bahay ang tubig.

Malakas ang agos ng tubig dito.

May mga residenteng hindi makalabas dahil sa baha.

Umaapaw na ang ilog malapit sa amin.

Lubog na sa tubig ang ilang bahagi ng kalsada.

May mga taong naipit sa mataas na tubig.

Kailangan namin ng rescue dahil sa pagbaha.

May emergency dahil mabilis ang pagtaas ng tubig.

The floodwater is getting deeper.

Water has entered our house.

The road is no longer passable because of flooding.

Several people are stranded by the flood.

The water level is rising rapidly.

There are vehicles trapped in the floodwater.

We need rescue assistance in the flooded area.

The river near us is overflowing.

Strong currents are flowing through the area.

Residents are unable to leave because of the flooding.

Parts of the road are completely underwater.

People are trapped by the rising water.

Please send help, the flooding is getting worse.

There is severe flooding in our area.

We need emergency rescue due to the flood.

# **Expected:**

I understand. You’re reporting flooding/ water type incident. Please provide the exact incident location or use your current location.

If the user says:

Mataas na yung baha at may mga taong stranded.

The chatbot should recognize that people are already affected.

# **Expected:**

I understand. You’re reporting flooding with affected individuals. Please provide the exact incident location or use your current location.

# **8.0 EMERGENCY — UNKNOWN CAUSE**

# **8.1 Guest Mode**

**User chooses:**

# **Other**

# **Chatbot:**

Please briefly describe what is happening so I can determine the appropriate type of incident.

If it appears to be an emergency:

I understand. Please provide the exact location or use your current location.

Then collect only relevant information.

At the end:

Please provide a contact number where responders can reach you.

# **8.2 User Mode**

**User chooses:**

# **Other**

# **Chatbot:**

Please briefly describe what is happening so I can determine the appropriate type of incident.

The chatbot uses the user's account information and does not ask for their contact number or landmark.

# **8.3 Unknown Cause — Typed Responses**

May emergency dito pero hindi ko alam kung ano.

May kakaibang nangyayari dito.

I don't know what happened but people need help.

May nakita akong tao na nakahandusay.

Hindi ko alam kung ano yung nangyari.

May nangyaring emergency dito pero hindi malinaw kung ano.

Kailangan ng tulong dito, hindi ko alam ang nangyari.

May nakita akong kaguluhan pero hindi ko alam ang dahilan.

May taong nangangailangan ng tulong pero hindi ko alam kung bakit.

May insidente dito na hindi ko matukoy.

Hindi ko alam kung anong klaseng emergency ito.

May kakaibang sitwasyon dito at kailangan ng responder.

May nangyari sa lugar namin pero wala akong sapat na impormasyon.

Nakakita ako ng taong nakahiga sa daan at hindi ko alam ang nangyari.

May emergency situation dito.

Hindi malinaw ang nangyari pero may nangangailangan ng agarang tulong.

May problema dito pero hindi ko matukoy ang sanhi.

May insidente pero hindi ko alam kung paano ito nagsimula.

Kailangan namin ng tulong para malaman kung ano ang nangyayari.

May hindi pangkaraniwang pangyayari dito.

There is an emergency here, but I am not sure what happened.

Something unusual happened and people may need help.

I found someone who needs assistance, but I do not know what occurred.

There is an incident here, but the cause is unclear.

I cannot identify what kind of emergency this is.

Something happened in this area, and we need someone to check.

There appears to be an emergency, but I have limited information.

I saw someone lying on the ground and do not know what happened.

There is a situation here that requires immediate attention.

The cause of the incident is unknown.

Something unexpected has happened here.

I am not sure what is going on, but assistance is needed.

There is an unusual situation in this area.

We need responders to check what happened.

I don't know the cause, but there is an emergency here.

# **Expected:**

I understand. Please describe what you can currently see or what happened so I can assist you with the report.

The chatbot should not force the user to choose an incident type when the situation is unclear.

# **9.0 NON-EMERGENCY — PATIENT TRANSPORT**

# **9.1 Guest Mode**

# **User chooses:**

# **Patient Transport**

# **Chatbot:**

I understand. You’re requesting patient transport. Please provide the patient’s location or use your current location.

Then:

How many patients need transportation?

# **Buttons:**

- 1

- 2–5

- More than 5

Then:

What is the patient’s current condition?

# **Buttons:**

- Stable

- Needs Assistance

- Unable to Walk

- Other

- Not Sure

Then:

Please provide a contact number where responders can reach you.

# **9.2 User Mode**

# **Chatbot:**

I understand. You’re requesting patient transport. Please provide the patient's current location or use your current location.

The chatbot does not ask for the user's contact number or landmark.

Then continue with the relevant patient information.

# **9.3 Patient Transport — Typed Responses**

Kailangan namin ng ambulance para ihatid yung patient.

Need patient transport.

Ihahatid sana yung pasyente sa hospital.

Kailangan namin ng transport papuntang hospital pero stable naman siya.

We need transportation for a patient.

Kailangan ng ambulansya para madala ang pasyente sa ospital.

May pasyente na kailangang ihatid sa hospital.

Pwede po bang mag-request ng patient transport?

Kailangan namin ng medical transport para sa pasyente.

Stable naman ang pasyente pero kailangan dalhin sa ospital.

Kailangan ng sasakyan para sa medical transfer.

May scheduled checkup ang pasyente at kailangan ng transport.

Kailangan naming maihatid ang pasyente sa ibang ospital.

May pasyente na hindi kayang bumiyahe mag-isa.

Kailangan ng ambulance service para sa hospital transfer.

Magpapahatid po sana ng pasyente papuntang clinic.

Kailangan ng transport para sa follow-up checkup ng pasyente.

Ililipat namin ang pasyente sa medical facility.

Kailangan ng ligtas na transportasyon para sa pasyente.

Maaari po bang humingi ng ambulansya para sa patient transfer?

We need an ambulance to transport a patient to the hospital.

A patient needs transportation to a medical facility.

Can we request medical transport for a patient?

The patient is stable but needs to be taken to the hospital.

We need assistance transferring a patient.

A patient cannot travel independently and needs transport.

Please provide transportation for a hospital transfer.

We need a medical vehicle for patient transport.

The patient needs to be transferred to another hospital.

We need safe transportation for the patient.

Please arrange transport to the clinic.

A patient needs assistance getting to a scheduled appointment.

We need transport for a medical checkup.

Can an ambulance assist with a patient transfer?

Please send medical transport for the patient.

# **Expected:**

I understand. You’re requesting patient transport. Please provide the patient’s current location or use your current location.

# **10.0 NON-EMERGENCY — MINOR MEDICAL COMPLAINT**

# **10.1 Guest Mode**

# **User chooses:**

# **Minor Medical Complaint**

# **Chatbot:**

I understand. Please briefly describe the patient’s condition.

Then:

Please provide the patient's location or use your current location.

Then collect contact number.

# **10.2 User Mode**

# **Chatbot:**

I understand. Please briefly describe the patient’s condition.

Then:

Please provide the incident location or use your current location.

No contact number or landmark question.

# **10.3 Minor Medical Complaint — Typed Responses**

Masakit lang yung ulo niya.

May lagnat pero okay naman siya.

Minor injury lang.

May maliit na sugat.

Masakit yung paa pero kaya naman niyang maglakad.

The patient has a minor injury.

Nahihilo lang siya pero gising naman.

Masakit ang tiyan niya pero manageable naman.

May konting ubo at sipon lang. May maliit na pasa sa braso. Medyo masakit ang likod niya. May bahagyang pamamaga sa kamay. Nagre-reklamo lang siya ng pananakit ng ngipin. Masakit ang lalamunan niya pero okay naman. May konting gasgas lang sa tuhod. Masama lang ang pakiramdam niya pero hindi naman malala. May simpleng allergy reaction lang. Medyo nanghihina pero nakakausap naman. Masakit ang braso niya pagkatapos matamaan. May maliit na hiwa sa daliri. Kailangan lang ng basic medical assistance. The patient only has a mild headache.

There is a small bruise on their arm. The person has a minor cut.

They are feeling slightly dizzy but are awake. The patient has a mild stomachache. There is slight swelling on the hand. They have a minor scrape on their knee. The person has a mild sore throat. They are experiencing mild back pain.

The patient has a toothache but is otherwise okay.

The injury appears to be minor.

They are feeling unwell but the condition does not seem serious.

The patient has a mild cough and cold.

There is a small cut on the finger.

They only need basic medical assistance.

# **Expected:**

I understand. Please provide the incident location or use your current location.

# **11.0 NON-EMERGENCY BECOMES EMERGENCY**

The chatbot should reassess the situation whenever the user provides new information.

# **Example**

User:

Minor injury lang po.

Later:

Actually hindi na siya magising.

# **Expected chatbot:**

I understand. The situation may now require emergency medical assistance. Please provide or confirm the exact location so responders can be directed to you.

The chatbot should prioritize the latest information.

# **12.0 PREVIOUS REPORT — NEW INCIDENT**

# **12.1 Different Incident**

Previous report:

Fire in Barangay A.

User:

May accident naman ngayon sa highway.

# **Expected:**

I understand. You’re reporting a new vehicular collision. Please take a photo of the incident first.

The chatbot starts a new report.

# **13.0 PREVIOUS REPORT — UPDATE**

Previous report:

Fire in Barangay A.

User:

Update po sa report ko. Lumalaki na yung apoy.

# **Expected:**

Understood. You’re providing an update about your previous fire report. Please take a photo of the current situation if it is safe to do so.

The chatbot should continue the existing report.

# **14.0 PREVIOUS REPORT — UNCLEAR**

User:

Magre-report ulit ako.

# **Expected:**

Is this an update to your previous report or a new incident?

# **Buttons:**

- Update Previous Report

- New Incident

# **15.0 PREVIOUS REPORT — SAME INCIDENT TYPE, DIFFERENT INCIDENT**

Previous report:

Fire in Barangay A.

User:

May sunog din sa kabilang barangay.

# **Expected:**

I understand. This appears to be a new fire incident. Please take a photo of the incident first.

Same incident type does not automatically mean it is the same report.

# **16.0 USER PROVIDES MULTIPLE DETAILS AT ONCE**

This is the preferred fast-reporting behavior.

# **Guest Mode**

User:

May sunog sa bahay namin sa Brgy. Tiaong. Tatlo kami dito at yung isa hindi makalabas. 09171234567.

The chatbot already knows:

- Fire

- Emergency

- Location

- 3 people affected

- 1 trapped

- Contact number

# **Chatbot:**

I understand. You’re reporting a fire emergency in Brgy. Tiaong involving 3 people, with 1 person trapped. Please take a photo of the current situation if it is safe to do so.

Only missing information should be requested.

# **User Mode**

User:

May sunog sa bahay namin. Tatlo kami at yung isa hindi makalabas.

The chatbot already has the user's account information.

# **Chatbot:**

I understand. You’re reporting a fire emergency involving 3 people, with 1 person trapped. Please take a photo of the current situation if it is safe to do so. Then, please confirm the incident location using your current GPS.

No phone number question.

No landmark question.

# **17.0 USER ANSWERS WITH SHORT RESPONSES**

The chatbot should understand short answers based on the previous question.

# **Chatbot:**

How many people are affected?

User:

Tatlo.

# **Chatbot:**

Thank you. I’ve recorded 3 people affected.

# **Chatbot:**

Are there any injured or trapped people?

User:

Oo, dalawa.

# **Chatbot:**

Thank you. I’ve recorded 2 affected people. What is their current condition?

# **Chatbot:**

What is their current condition?

User:

Yung isa unconscious.

# **Chatbot:**

Understood. I’ve recorded that one person is unconscious or unresponsive.

# **18.0 USER CORRECTS INFORMATION**

User:

Tatlo kami.

Later:

Actually apat pala.

# **Expected:**

Understood. I’ve updated the number of people affected to 4.

The latest information should be used.

# **19.0 USER CANNOT TAKE A PHOTO**

User:

Hindi ako makapag-picture.

# **Expected:**

That’s okay. If taking a photo is not possible, you may continue with your report. Please tell me what happened.

# **20.0 USER SAYS IT IS UNSAFE TO TAKE A PHOTO**

User:

Delikado lumapit para mag-picture.

# **Expected:**

Your safety comes first. Please do not put yourself in danger to take a photo. You may continue with your report without one.

There should be no Upload Photo option.

# **21.0 USER GIVES LOCATION HIMSELF**

# **Guest Mode**

User:

May sunog sa Brgy. Tiaong, malapit sa palengke.

The chatbot should recognize the location and should not ask:

Where is the incident?

Instead:

I understand. You’re reporting a fire in Brgy. Tiaong, near the public market. Please take a photo of the incident first if it is safe to do so.

# **User Mode**

If the user's account already contains their location but the incident is elsewhere:

User:

May sunog sa Brgy. Tiaong.

The chatbot should recognize that the incident location may be different from the user's account information and use the **incident location** , not automatically assume the user's registered location.

# **22.0 USER'S ACCOUNT INFORMATION VS INCIDENT INFORMATION**

This distinction is important.

# **User Mode**

The user's account information is used for:

- Contact number

- User information

- Registered details

But the **incident location should always refer to where the incident is actually happening** .

Example:

User lives in Barangay A but reports:

May accident sa Barangay B.

The chatbot should use:

# **Incident Location: Barangay B**

It should not assume the incident happened in Barangay A.

# **23.0 FINAL CONFIRMATION**

After all required information has been collected:

# **Guest Mode**

Your report is ready. Please review the information before submitting.

# **User Mode**

Your report is ready. Please review the information before submitting.

The confirmation should show the relevant information:

- Incident Type

- Nature of Call

- Location

- Number of People Affected

- Victim Condition, if applicable

- Photo / Evidence

- Contact Number

For User Mode, the contact number may be shown as the account's registered contact number without asking the user to enter it again.

# **24.0 CORE RULE FOR FAST INCIDENT REPORTING**

The chatbot should always follow:

# **Understand → Classify → Check what information is already available → Ask only for missing relevant information → Confirm**

It should **not** follow a rigid questionnaire where every user is asked the same questions.

# **Example of slow reporting:**

What happened?

Where are you?

What is your landmark?

What is your phone number?

How many people?

Are they injured?

What is their condition?

# **Preferred reporting:**

User:

May accident sa highway, tatlong tao yung involved at may isang hindi gumagalaw. Nasa Brgy. Tiaong kami.

# Chatbot:

I understand. You’re reporting a vehicular collision in Brgy. Tiaong involving 3 people, with 1 person who is unresponsive. Please take a photo of the incident if it is safe to do so.

The chatbot asks only for what is still missing.

# **Possible User Message:**

User:

Kailangan po namin ng tulong dito sa bandang (kung saan yung lugar), nagkaron po ng (ung aksidente) at (kung gano kadami/possible na sabihing hindi alam kung ilan ang nasama sa aksidente).

Chatbot:

I understand. (Summarization of gathered data na nilagay ni user).

Chatbot will ask for the other missing details needed.

# **25.0 QUICK CLASSIFICATION REFERENCE**

|**User Description**|**Nature of Call**|**Incident Type**|
|---|---|---|
|“May sunog.”|Emergency|Fire Emergency|
|“Nasusunog yung bahay.”|Emergency|Fire Emergency|
|“May nagbanggaan.”|Emergency|Vehicular Collision|
|“May car accident.”|Emergency|Vehicular Collision|
|“May nahimatay.”|Emergency|Medical Emergency|
|“Hindi humihinga.”|Emergency|Medical Emergency|
|“Gumuho yung building.”|Emergency|Structural Failure|
|“May taong trapped sa building.”|Emergency|Structural Failure|
|“Binabaha kami.”|Emergency|Flood / Water|
|“May mga stranded sa baha.”|Emergency|Flood / Water|
|“May emergency pero hindi ko alam kung<br>ano.”|Emergency|Unknown Cause|
|“Kailangan ihatid yung stable na patient.”|Non-Emergen<br>cy|Patient Transport|
|“Masakit lang ulo niya.”|Non-Emergen<br>cy|Minor Medical<br>Complaint|



“May maliit na sugat.”

Non-Emergen Minor Medical cy Complaint

# **26.0 LANGUAGE HANDLING**

The chatbot should understand:

# **Filipino**

May sunog po sa bahay namin.

# **English**

There is a fire in our house.

# **Taglish**

May fire po sa bahay namin.

All three should be understood as:

# **Emergency — Fire Emergency**

The chatbot should preferably respond in the same language style as the user.

# **Filipino**

Naiintindihan ko po. Nagre-report kayo ng sunog. Pakibigay po ang exact location o i-allow ang GPS.

# **English**

I understand. You’re reporting a fire. Please provide the exact location or allow GPS access.

# **Taglish**

I understand po. You’re reporting a fire. Please provide the exact location or allow GPS access.
