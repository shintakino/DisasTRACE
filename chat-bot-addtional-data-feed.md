# Additional typed-report triage feed

This is a source dataset for the chatbot's initial typed-report classification. It helps the chatbot propose whether a request is `EMERGENCY` or `NON-EMERGENCY` and select one existing incident type. It is not a medical diagnosis or an automatic-dispatch rule.

## Runtime safeguards

- Only reviewed, high-signal phrases are distilled into deterministic server-side rules. The raw examples below are not sent in full to DeepSeek or to the mobile app.
- Critical language always wins over routine wording in the same message. For example, a transport request that also says the patient cannot breathe is proposed as `EMERGENCY`.
- `NON-EMERGENCY` is a proposed report nature for review and normal server/PACC handling; it never suppresses a clearly critical message.
- The chatbot must use existing incident types only: Medical Emergency, Vehicular Collision, Fire Emergency, Structural Failure, Flood/Water, Unknown Cause, Patient Transport, and Other / non-emergency request.
- The intake API and PACC remain the final authority for validation, triage, dispatch, duplicate handling, and escalation.

## Supplied examples

| EMERGENCY                              | NON-EMERGENCY                |
| -------------------------------------- | ---------------------------- |
| Nahihirapan huminga.                   | Nahihirapan sya lumunok.     |
| Hindi siya makahinga.                  | May history ng high blood.   |
| Humihingal siya.                       | May history ng heart attack. |
| May tunog ang paghinga niya.           | Nahilo bigla.                |
| Nawalan siya ng hininga sandali.       | Nanlalabo ang paningin.      |
| Namamaga ang lalamunan niya.           | Naipit sa pinto.             |
| May bara sa lalamunan.                 | Nasugatan sa baso.           |
| Inaatake ng hika.                      | Nasugatan sa kutsilyo.       |
| Nabulunan siya.                        | Nasunog ang balat.           |
| Masakit ang dibdib.                    | Nagsusuka.                   |
| Mabigat ang dibdib.                    | Masakit ang tiyan.           |
| Tumitibok nang sobrang bilis ang puso. | Pabalik-balik ang pagtatae.  |
| Mabagal ang tibok ng puso.             | Hindi makalunok.             |
| Parang humihinto ang puso.             | Hindi makakain.              |
| Nahulog siya tapos sumakit ang dibdib. | Hindi maigalaw ang tuhod.    |
| Namumutla siya.                        | Hindi maigalaw ang balikat.  |
| Pawis na pawis siya.                   | Namamaga ang kamay.          |
| Hindi makapagsalita.                   | Namamaga ang paa.            |
| Hindi maigalaw ang kalahating katawan. | Natamaan sa baywang.         |
| Nanghihina ang braso.                  | Natamaan sa hita.            |
| Nanghihina ang paa.                    | Natamaan sa siko.            |
| Nawalan ng malay.                      | Nilalagnat siya.             |
| Nag-seizure siya.                      | Nanginginig siya.            |
| Nagkikisay siya.                       | Nanghihina siya.             |
| Hindi siya tumutugon.                  | Namumutla siya.              |
| Dumudugo nang malakas.                 | Pawis na pawis.              |

| May sugat sa ulo.                     | Nahihilo kapag tumatayo.                  |
| ------------------------------------- | ----------------------------------------- |
| Nabalian ng paa.                      | Nawalan ng balanse.                       |
| Nabalian ng kamay.                    | Namamaga ang mata.                        |
| Natamaan ng sasakyan.                 | Namamaga ang kamay.                       |
| Nahulog sa hagdan.                    | Namamaga ang paa.                         |
| May dugo sa suka.                     | Namumula ang balat.                       |
| Namimilipit sa sakit.                 | May pantal sa buong katawan.              |
| May dugo sa dumi.                     | Nangangati nang sobra.                    |
| Namamaga ang tiyan.                   | Nagpapanic siya.                          |
| Nahulog tapos sumakit ang tiyan.      | Umiiyak nang sobra.                       |
| Natamaan sa likod.                    | Nagmumura at sumisigaw.                   |
| Natamaan sa leeg.                     | Nanlalabo paningin ko.                    |
| Natamaan sa batok.                    | Nahihilo ako, parang umiikot ang paligid. |
| Hindi makagalaw.                      | Nilalagnat ako ng mataas.                 |
| Nahulog at hindi makatayo.            | Nanginginig buong katawan ko.             |
| Biglang nanghina.                     | Sumasakit tiyan ko, grabe.                |
| Namamaga ang mukha.                   | Nasunog balat ko.                         |
| Namamaga ang labi.                    | Nahihirapan akong lunukin.                |
| Nahihirapan huminga dahil sa allergy. | Naipit kamay ko sa pinto.                 |
| Nag-collapse dahil sa allergy.        | Nagasgas ako sa baso.                     |
| Naaksidente sa motor.                 | Lods, nahihilo ako sobra.                 |
| Naaksidente sa kotse.                 | Nanlalabo mata ko.                        |
| Naaksidente sa bisikleta.             | Nahihilo ako sobra.                       |
| Nahulog mula sa mataas.               | Nilalagnat ako ng mataas.                 |
| Naipit sa sasakyan.                   | Nanginginig buong katawan ko.             |
| Nasunog sa apoy.                      | Sumasakit tiyan ko.                       |
| Nalason sa pagkain.                   | Nasunog balat ko.                         |

| Nalason sa kemikal.<br>Nalason sa gamot.          | Nahihirapan akong lunukin.<br>Kuya, ang sakit ng ulo ko. |
| ------------------------------------------------- | -------------------------------------------------------- |
| Nalason sa alak.                                  | Sis, nahihilo ako sobra.                                 |
| Hindi makontrol ang sarili.                       | Lods, nanginginig ako.                                   |
| Nagwawala.                                        | Nahihirapan akong umupo.                                 |
| Hindi makausap nang maayos.                       | Nadapa ako, sugatan ako.                                 |
| Biglang tumigil sa pagsasalita.                   | Nadapa ako sa kalsada.                                   |
| Parang nawawala sa sarili.                        | Nadapa ako sa hagdan.                                    |
| Hindi kilala ang paligid.                         | Nadapa ako sa palengke.                                  |
| Naglalakad nang wala sa direksyon.                | Nadapa ako sa eskwela.                                   |
| Nahihirapan akong huminga.                        | Nadapa ako sa opisina.                                   |
| Masakit ang dibdib ko.                            | Nadapa ako sa bahay.                                     |
| Parang hinihingal ako sobra.                      | Nadapa ako sa kalsada.                                   |
| Nawalan ako ng malay kanina.                      | Nadapa ako sa jeep.                                      |
| Namamanhid yung kamay ko.                         | Nadapa ako sa tricycle.                                  |
| Hindi ko maigalaw yung paa ko.                    | Nadapa ako sa bus.                                       |
| Namimilipit ako sa sakit.                         | Nadapa ako sa mall.                                      |
| Nahulog ako sa hagdan, ang sakit ng likod ko.     | Nadapa ako sa simbahan.                                  |
| Nabalian yata ako ng buto.                        | Nadapa ako sa parke.                                     |
| May sugat ako, dumudugo ng malakas.               | Nadapa ako sa palengke.                                  |
| Nahulog ako sa motor, hindi ako makatayo.         | Nadapa ako sa tindahan.                                  |
| Parang atake sa puso, ang bilis tibok ng puso ko. | Nadapa ako sa kusina.                                    |
| Hindi ako makapagsalita ng maayos.                | Nadapa ako sa banyo.                                     |
| Nalason ako, uminom ako ng panlinis.              | Nadapa ako sa sala.                                      |
| Nakain ko yung expired na pagkain.                | Nadapa ako sa kwarto.                                    |
| Na-overdose ako sa gamot.                         | Nadapa ako sa bubong.                                    |
| Nainom ko yung bleach.                            | Nadapa ako sa bakuran.                                   |
| Nakainom ako ng maraming alak, hindi ko kaya.     | Nadapa ako sa kalsada.                                   |

| May nilunok akong tablet, sobra dami.         | Nadapa ako sa eskinita.                                   |
| --------------------------------------------- | --------------------------------------------------------- |
| Parang nasobrahan ako sa drugs.               | Nadapa ako sa tulay.                                      |
| Nahilo ako pagkatapos uminom ng gamot.        | Nadapa ako sa dagat.                                      |
| Sumusuka ako ng dugo.                         | Nadapa ako sa ilog.                                       |
| Parang nasunog lalamunan ko sa ininom ko.     | Nadapa ako sa bundok.                                     |
| Naaksidente ako sa kotse.                     | Nadapa ako sa bukid.                                      |
| Nabangga ako ng motor.                        | Nadapa ako sa gubat.                                      |
| Nahulog ako sa bike.                          | Nadapa ako sa palayan.                                    |
| Natusok ako ng matalim na bagay.              | Nadapa ako sa semento.                                    |
| Natamaan ulo ko, dumudugo.                    | Nadapa ako sa bato.                                       |
| Nadapa ako, hindi ako makatayo.               | Nadapa ako sa putik.                                      |
| Nabagsakan ako ng mabigat.                    | Nadapa ako sa buhangin.                                   |
| Natusok ako ng pako.                          | Nadapa ako sa kahoy.                                      |
| Nasunog bahay namin!                          | Nadapa ako sa bakal.                                      |
| May apoy dito, hindi ako makalabas.           | Nadapa ako sa baso.                                       |
| Napasok ako ng mantika.                       | Nadapa ako sa plastic.                                    |
| Nadikit ako sa mainit na bakal.               | Nadapa ako sa tela.                                       |
| Nabuhusan ako ng kumukulong tubig.            | Nadapa ako sa papel.                                      |
| Nalulunod ako!                                | Nadapa ako sa karton.                                     |
| Hindi ako makalangoy.                         | Nadapa ako sa lata.                                       |
| Naipit ako sa tubig.                          | Nadapa ako sa bote.                                       |
| Nabugbog ako sa alon.                         | Nadapa ako sa basura.                                     |
| Nainom ko yung tubig, hindi ako makahinga.    | Nadapa ako sa kalye.                                      |
| Nakuryente ako!                               | Nadapa ako sa eskinita.                                   |
| Nahawakan ko yung live wire.                  | Nadapa ako sa kanto.                                      |
| Nanginig katawan ko, nakuryente ako.          | Nadapa ako sa daan.                                       |
| Hindi ko maigalaw kamay ko, nakakapit pa rin. | Kailangan namin ng ambulance para ihatid yung<br>patient. |

| Sinaksak ako!                                                                   |                                                                                                       |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Binugbog ako, duguan ako.                                                       | Need patient transport.<br>Ihahatid sana yung pasyente sa hospital.                                   |
| Binarel ako.                                                                    | Kailangan namin ng transport papuntang hospital                                                       |
| May tama ako sa katawan.                                                        | <br>pero stable naman siya.                                                                           |
| May sugat ako sa ulo, binato ako.                                               | We need transportation for a patient.                                                                 |
| May tumusok sa akin.                                                            | Kailangan ng ambulansya para madala ang<br>pasyente sa ospital.                                       |
| Grabe, hindi ako makahinga!<br>Bro, ang sakit ng dibdib ko!                     | <br>May pasyente na kailangang ihatid sa hospital.<br>Pwede po bang mag-request ng patient transport? |
| Parang mamamatay na ako, tulungan niyo ako!<br>Sh*t, nahulog ako!               | <br>Kailangan namin ng medical transport para sa<br>pasyente.                                         |
| Kuya, duguan ako, bilis!                                                        | Stable naman ang pasyente pero kailangan dalhin<br>sa ospital.                                        |
| Pare, hindi ko na kaya, tulong!                                                 | <br>Kailangan ng sasakyan para sa medical transfer.                                                   |
| Sis, hindi ko maigalaw katawan ko.<br>Ang sakit sobra, parang mababaliw na ako. | <br>May scheduled checkup ang pasyente at<br>kailangan ng transport.                                  |
| Help me, hindi ako makagalaw!                                                   | Kailangan naming maihatid ang pasyente sa<br>ibang ospital.                                           |
| Nahihirapan akong huminga.                                                      | May pasyente na hindi kayang bumiyahe mag-isa                                                         |
| Masakit dibdib ko, parang heart attack.<br>Namamanhid kamay ko.                 | .<br>Kailangan ng ambulance service para sa hospital<br>transfer.                                     |
| Hindi ko maigalaw paa ko.                                                       | Magpapahatid po sana ng pasyente papuntang<br>clinic.                                                 |
| Namimilipit ako sa sakit.<br>Nahulog ako sa hagdan.                             | Kailangan ng transport para sa follow-up checkup<br>ng pasyente.                                      |
| Nabalian yata ako ng buto.                                                      | Ililipat namin ang pasyente sa medical facility.                                                      |
| May sugat ako, dumudugo.                                                        | Kailangan ng ligtas na transportasyon para sa<br>pasyente.                                            |
| Hindi ako makatao                                                               |                                                                                                       |
| y.                                                                              | Maaari po bang humingi ng ambulansya para sa                                                          |
| Parang atake sa puso.                                                           | <br>patient transfer?                                                                                 |
| Hindi ako makapagsalita.                                                        | We need an ambulance to transport a patient to<br>the hospital.                                       |
| Nangingitim labi ko.<br>Nawalan ako ng malay.                                   | A patient needs transportation to a medical facility.                                                 |

| Bro, hindi ako makahinga.                                                 | Can we request medical transport for a patient?<br>The patient is stable but needs to be taken to the                                    |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Sh*t, hindi ko kaya.                                                      | <br>hospital.                                                                                                                            |
| Pare, tulungan niyo ako.                                                  | We need assistance transferring a patient.                                                                                               |
| Help me, hindi ako makagalaw.                                             | A patient cannot travel independently and needs<br>transport.                                                                            |
| Ang bilis tibok ng puso ko.                                               | Please provide transportation for a hospital                                                                                             |
| Parang stroke, hindi ko maigalaw kalahati ng<br>katawan.                  | <br>transfer.                                                                                                                            |
| Namamanhid mukha ko.<br>Hindi ko maramdaman daliri ko.                    | We need a medical vehicle for patient transport.<br>The patient needs to be transferred to another<br>hospital.                          |
| Sumusuka ako ng dugo.                                                     | We need safe transportation for the patient.                                                                                             |
| Parang mababaliw ako sa sakit.                                            | Please arrange transport to the clinic.                                                                                                  |
| Hindi ko makita paligid.                                                  | A patient needs assistance getting to a scheduled<br>appointment.                                                                        |
| Nahulog ako sa motor.                                                     |                                                                                                                                          |
|                                                                           | We need transort for a medical checku                                                                                                    |
| Nabagsakan ako ng mabigat.<br>Natusok ako ng matalim.<br>Natamaan ulo ko. | p p.<br>Can an ambulance assist with a patient transfer?<br>Please send medical transport for the patient.<br>Masakit lang yung ulo niya |
| Nadurog tuhod ko.                                                         | .<br>                                                                                                                                    |
|                                                                           | May lagnat pero okay naman siya.                                                                                                         |
| Hindi ako makalakad.                                                      | <br>Minor inr lan                                                                                                                        |
| Nahulog ako sa bike.                                                      | juy g.<br>May maliit na sugat.                                                                                                           |
| Nabugbog ako.                                                             | <br>                                                                                                                                     |
| Nabalian ako ng braso.                                                    | Masakit yung paa pero kaya naman niyang<br>maglakad.                                                                                     |
| Nabalian ako ng paa.                                                      | The patient has a minor injury.                                                                                                          |
| Nabalian ako ng daliri.                                                   | Nahihilo lang siya pero gising naman.                                                                                                    |
| Nabalian ako ng leeg.                                                     | Masakit ang tiyan niya pero manageable naman.                                                                                            |
| Nabalian ako ng balikat.                                                  | May konting ubo at sipon lang.                                                                                                           |
| Nahulog ako sa puno.                                                      | May maliit na pasa sa braso.                                                                                                             |
| Nalason ako, uminom ako ng panlinis.                                      | Medyo masakit ang likod niya.                                                                                                            |
| Nakain ko expired na pagkain.                                             | May bahagyang pamamaga sa kamay.                                                                                                         |

| Na-overdose ako sa gamot.                    | Nagre-reklamo lang siya ng pananakit ng ngipin.             |
| -------------------------------------------- | ----------------------------------------------------------- |
| Nainom ko bleach, ang sakit ng lalamunan.    | Masakit ang lalamunan niya pero okay naman.                 |
| Sumusuka ako ng dugo.                        | May konting gasgas lang sa tuhod.                           |
| Parang nasunog tiyan ko.                     | Masama lang ang pakiramdam niya pero hindi<br>naman malala. |
| Bro, nasobrahan ako sa drugs.<br>            | May simpleng allergy reaction lang.                         |
| Kuya, nahihilo ako, hindi ko kaya.           | Medyo nanghihina pero nakakausap naman.                     |
| Sh*t, ang sakit ng tiyan ko.                 | <br>Masakit ang braso niya pagkatapos matamaan.             |
| Parang mamamatay ako, tulungan niyo ako.<br> | May maliit na hiwa sa daliri.                               |
| Lods, sobra alak na-inom ko.<br>             | Kailangan lang ng basic medical assistance.                 |
| Hindi ako makahinga, parang nalason.         | The patient only has a mild headache.                       |
| Sumakit ulo ko bigla.                        | <br>There is a small bruise on their arm.                   |
| Namimilipit ako sa sakit.                    | The person has a minor cut.                                 |
| Help na-overdose ako                         |                                                             |
| , .                                          | They are feeling slightly dizzy but are awake.              |
| Pare, hindi ko na kaya.                      | <br>The patient has a mild stomachache.                     |
| Nainom ko yung sabon.                        | <br>There is slight swelling on the hand.                   |
| Nakain ko yung panis na ulam.                | They have a minor scrape on their knee.                     |
| Nainom ko yung tubig na may kemikal.<br>     | The person has a mild sore throat.                          |
| Nalusaw lalamunan ko sa ininom ko.           | They are experiencing mild back pain.                       |
| Nahilo ako pagkatapos uminom ng gamot.       | <br>The patient has a toothache but is otherwise okay.      |
| Nagsusuka ako ng sobra.                      | The injury appears to be minor.                             |
| Nainom ko yung insecticide.                  | They are feeling unwell but the condition does not          |
| Nakain ko yung chocolate na expired.         | <br>seem serious.                                           |
| Nainom ko yung gamot na hindi para sa akin.  | The patient has a mild cough and cold.                      |
| Nainom ko yung acetone.                      | There is a small cut on the finger.                         |
| Nainom ko yung alcohol.                      | They only need basic medical assistance.                    |
| Nainom ko yung panlinis ng CR.               |                                                             |
| Nainom ko yung muriatic acid.                |                                                             |

Nainom ko yung gasolina. Nainom ko yung thinner. Nainom ko yung kerosene. Nainom ko yung paint. Nainom ko yung varnish. Nainom ko yung pesticide. Nainom ko yung rat poison. Nainom ko yung panlinis ng sahig. Nainom ko yung detergent. Nainom ko yung dishwashing liquid. Nainom ko yung shampoo. Nainom ko yung lotion. Nainom ko yung perfume. Nainom ko yung mouthwash. Nainom ko yung nail polish remover. Nainom ko yung battery acid. Nainom ko yung tubig na may kalawang. Nainom ko yung tubig na marumi. Nainom ko yung tubig na may lason. Nainom ko yung tubig na may bleach. Nainom ko yung tubig na may sabon. Nainom ko yung tubig na may kemikal. Nainom ko yung tubig na may pintura. Nainom ko yung tubig na may gasolina. Nainom ko yung tubig na may thinner. Nainom ko yung tubig na may kerosene. Nainom ko yung tubig na may varnish. Nainom ko yung tubig na may pesticide.

| Nainom ko yung tubig na may rat poison.          |
| ------------------------------------------------ |
| Nainom ko yung tubig na may detergent.           |
| Nainom ko yung tubig na may dishwashing liquid.  |
| Nainom ko yung tubig na may shampoo.             |
| Nainom ko yung tubig na may lotion.              |
| Nainom ko yung tubig na may perfume.             |
| Nainom ko yung tubig na may mouthwash.           |
| Nainom ko yung tubig na may nail polish remover. |
| Nainom ko yung tubig na may battery acid.        |
| Nainom ko yung tubig na may kalawang.            |
| Nainom ko yung tubig na marumi.                  |
| Nainom ko yung tubig na may lason.               |
| Nainom ko yung tubig na may bleach.              |
| Nainom ko yung tubig na may sabon.               |
| Nainom ko yung tubig na may kemikal.             |
| Nainom ko yung tubig na may pintura.             |
| Nainom ko yung tubig na may gasolina.            |
| Nainom ko yung tubig na may thinner.             |
| Nainom ko yung tubig na may kerosene.            |
| Nainom ko yung tubig na may varnish.             |
| Nainom ko yung tubig na may pesticide.           |
| Nainom ko yung tubig na may rat poison.          |
| Nainom ko yung tubig na may detergent.           |
| Nainom ko yung tubig na may dishwashing liquid.  |
| Nainom ko yung tubig na may shampoo.             |
| Nainom ko yung tubig na may lotion.              |
| Nainom ko yung tubig na may perfume.             |

| Nainom ko yung tubig na may mouthwash.<br>Nainom ko yung tubig na may nail polish remover. |
| ------------------------------------------------------------------------------------------ |
| Nainom ko yung tubig na may battery acid.                                                  |
| Nainom ko yung tubig na may kalawang.                                                      |
| Nainom ko yung tubig na marumi.                                                            |
| Nainom ko yung tubig na may lason.                                                         |
| Nainom ko yung tubig na may bleach.                                                        |
| Nainom ko yung tubig na may sabon.                                                         |
| Nainom ko yung tubig na may kemikal.                                                       |
| Nainom ko yung tubig na may pintura.                                                       |
| Nainom ko yung tubig na may gasolina.                                                      |
| Nainom ko yung tubig na may thinner.                                                       |
| Nainom ko yung tubig na may kerosene.                                                      |
| Nainom ko yung tubig na may varnish.                                                       |
| Nainom ko yung tubig na may pesticide.                                                     |
| Nainom ko yung tubig na may rat poison.                                                    |
| Nahulog siya mula sa mataas na gusali!                                                     |
| May binaril dito, duguan siya!                                                             |
| May sumabog, maraming sugatan!                                                             |
| Naaksidente sa kalsada, maraming tao ang<br>nasaktan!                                      |
| May nabangga ng kotse, hindi siya gumagalaw!                                               |
| May motor na bumangga, duguan yung driver!                                                 |
| May nabagsakan ng mabigat na bakal!                                                        |
| May nahulog sa hagdan, hindi makabangon!                                                   |
| May nalason, nagsusuka at nanginginig!                                                     |
| May nalunod sa ilog, hindi makahinga!                                                      |
| May nasunog, may paso sa buong katawan!                                                    |

May nakuryente, hindi gumagalaw! May sinaksak, duguan sa kalsada! May binugbog, hindi na makalakad! May nahulog sa bubong, sugatan! May bata na nabangga ng kotse! May matandang nahulog, hindi makagalaw! May sumabog na LPG, maraming sugatan! May granada na sumabog, maraming tao ang natamaan! May barilan sa palengke, may tama sa katawan! May aksidente sa jeep, maraming sugatan! May bus na bumangga, maraming tao ang nasaktan! May kotse na nagkarambola, maraming sugatan! May motor na sumemplang, duguan yung rider! May tao na nahulog sa tulay! May tao na nalunod sa dagat! May tao na nalunod sa swimming pool! May tao na nalunod sa ilog! May tao na nalunod sa kanal! May tao na nalunod sa balon! May tao na nalunod sa baha! May tao na nalunod sa sapa! May tao na nalunod sa lawa! May tao na nalunod sa dam! May tao na nalunod sa reservoir! May tao na nalunod sa fountain! May tao na nalunod sa drum ng tubig! May tao na nalunod sa tangke ng tubig!

May tao na nalunod sa fish pond! May tao na nalunod sa aquarium! May tao na nalunod sa paliguan! May tao na nalunod sa jacuzzi! May tao na nalunod sa bathtub! May tao na nalunod sa batis! May tao na nalunod sa creek! May tao na nalunod sa estero! May tao na nalunod sa dagat, hindi na makita! May tao na nalunod sa ilog, hindi na makita! May tao na nalunod sa swimming pool, hindi na makita! May tao na nalunod sa kanal, hindi na makita! May tao na nalunod sa balon, hindi na makita! May tao na nalunod sa baha, hindi na makita! May tao na nalunod sa sapa, hindi na makita! May tao na nalunod sa lawa, hindi na makita! May tao na nalunod sa dam, hindi na makita! May tao na nalunod sa reservoir, hindi na makita! May tao na nalunod sa fountain, hindi na makita! May tao na nalunod sa drum ng tubig, hindi na makita!

May tao na nalunod sa tangke ng tubig, hindi na makita!

May tao na nalunod sa fish pond, hindi na makita! May tao na nalunod sa aquarium, hindi na makita! May tao na nalunod sa paliguan, hindi na makita! May tao na nalunod sa jacuzzi, hindi na makita! May tao na nalunod sa bathtub, hindi na makita!

| May tao na nalunod sa batis, hindi na makita!  |
| ---------------------------------------------- |
| May tao na nalunod sa creek, hindi na makita!  |
| May tao na nalunod sa estero, hindi na makita! |
| May tao na binaril sa mall!                    |
| May tao na binaril sa eskwela!                 |
| May tao na binaril sa opisina!                 |
| May tao na binaril sa kalsada!                 |
| May tao na binaril sa jeep!                    |
| May tao na binaril sa bus!                     |
| May tao na binaril sa simbahan!                |
| May tao na binaril sa parke!                   |
| May tao na binaril sa palengke!                |
| May tao na binaril sa tindahan!                |
| May tao na binaril sa kusina!                  |
| May tao na binaril sa banyo!                   |
| May tao na binaril sa sala!                    |
| May tao na binaril sa kwarto!                  |
| May tao na binaril sa bubong!                  |
| May tao na binaril sa bakuran!                 |
| May tao na binaril sa kalsada!                 |
| May tao na binaril sa eskinita!                |
| May tao na binaril sa tulay!                   |
| May tao na binaril sa dagat!                   |
| May tao na binaril sa ilog!                    |
| May tao na binaril sa bundok!                  |
| May tao na binaril sa bukid!                   |
| May tao na binaril sa gubat!                   |

May tao na binaril sa palayan! May tao na binaril sa semento! May tao na binaril sa bato! May tao na binaril sa putik! May tao na binaril sa buhangin! May tao na binaril sa kahoy! May tao na binaril sa bakal! Nahulog siya mula sa bubong kanina, hindi na gumagalaw. Binangga siya ng kotse, duguan na. Sinaksak siya sa palengke, nakita ko mismo. Na-electrocute siya habang nag-aayos ng kuryente. Nalusutan siya ng bala, tumama sa dibdib. Na-overdose siya sa gamot kagabi. Nabagsakan siya ng hollow blocks. Nadapa siya sa hagdan, hindi makabangon. Nasunog siya sa kusina, paso buong braso. Nabugbog siya sa kanto, hindi makalakad. Nalusutan siya ng granada, sugatan lahat. Naipit siya sa jeep, hindi makaalis. Nabalian siya ng paa sa aksidente. Nalusutan siya ng bala sa ulo. Nabagsakan siya ng motor. Nadurog tuhod niya sa banggaan. Nalusutan siya ng kotse sa crossing. Nabagsakan siya ng kahoy. Nalusutan siya ng baso, sugatan. Nabagsakan siya ng bakal sa construction.

| May barilan dito, may tama na sa katawan!                        |
| ---------------------------------------------------------------- |
| May sumabog na LPG, maraming sugatan!                            |
| May nalunod sa ilog, hindi makahinga!                            |
| May nahulog sa tulay, duguan!                                    |
| May aksidente sa kalsada, maraming sugatan!                      |
| May motor na sumemplang, duguan yung rider!                      |
| May tao na sinaksak, hindi gumagalaw!                            |
| May tao na binugbog, hindi makabangon!                           |
| May tao na nakuryente, hindi humihinga!                          |
| May tao na nahulog sa bubong!                                    |
| May tao na nasunog sa kusina!                                    |
| May tao na naipit sa jeep!                                       |
| May tao na binaril sa mall!                                      |
| May tao na binaril sa eskwela!                                   |
| May tao na binaril sa opisina!                                   |
| May tao na binaril sa kalsada!                                   |
| May tao na binaril sa simbahan!                                  |
| May tao na binaril sa parke!                                     |
| May tao na binaril sa palengke!                                  |
| May tao na binaril sa tindahan!                                  |
| Kung hindi siya madadala agad, mamamatay siya!                   |
| Kapag hindi siya na-CPR, titigil na ang puso niya!               |
| Kung hindi siya madadala sa ospital, lalala sugat<br>niya!       |
| Kapag hindi siya malapatan ng gamot,<br>mawawalan siya ng malay! |
| Kung hindi siya madadala agad, dudugo siya<br>hanggang mamatay!  |
| Kapag hindi siya mailigtas, malulunod siya!                      |

Kung hindi siya madadala, magkaka-infection sugat niya!

Kapag hindi siya madadala agad, titigil paghinga niya!

Kung hindi siya madadala, mawawalan siya ng pulso!

Kapag hindi siya madadala agad, mamamatay siya sa paso!

Nahulog siya kanina, ngayon hindi na gumagalaw, baka mamatay kung walang tulong.

Binugbog siya kahapon, ngayon hindi makalakad, baka lumala bukas.

Naaksidente siya kanina, ngayon duguan, baka mawalan ng buhay.

Nalusutan siya ng bala, ngayon hindi humihinga, baka mamatay agad.

Nabagsakan siya ng kahoy, ngayon sugatan, baka mag-collapse.

Nadapa siya kanina, ngayon hindi makabangon, baka lumala bukas.

Na-overdose siya kagabi, ngayon hindi gumagalaw, baka mamatay.

Nasunog siya kanina, ngayon paso buong katawan, baka hindi makaligtas.

Nakuryente siya kanina, ngayon walang malay, baka tumigil puso.

Nalusutan siya ng granada, ngayon sugatan, baka mamatay agad.

Bro, binaril siya, duguan sobra!

Kuya, nahulog siya, hindi gumagalaw!

Sis, nasunog siya, paso buong katawan!

Pare, naaksidente siya, tulong!

Lods, nalunod siya, hindi humihinga!

Sh*t, binugbog siya, hindi makabangon!

Help, binaril siya, hindi gumagalaw! Bro, na-overdose siya, hindi humihinga! Kuya, nakuryente siya, tulungan niyo! Sis, nahulog siya, hindi makalakad! Pare, nasunog siya, paso buong katawan! Lods, binaril siya, duguan! Sh*t, naaksidente siya, hindi gumagalaw! Help, nalunod siya, hindi humihinga! Bro, sinaksak siya, duguan! Kuya, nabagsakan siya, sugatan! Sis, nadapa siya, hindi makabangon! Pare, na-overdose siya, hindi humihinga! Lods, nakuryente siya, hindi gumagalaw! Sh*t, binugbog siya, hindi makalakad! Nahulog ako, hindi ako makagalaw! Binarel ako, tulungan niyo ako! Sinaksak ako, duguan ako! Na-overdose ako, hindi ako makahinga! Nakuryente ako, hindi ako makagalaw! Nasunog ako, paso buong katawan ko! Nabugbog ako, hindi ako makabangon! Nahulog ako sa bubong, sugatan ako! Nalusutan ako ng bala, hindi ako makahinga! Naaksidente ako sa motor, duguan ako! May binaril dito, duguan siya! May nahulog dito, hindi gumagalaw! May nalunod dito, hindi humihinga! May nasunog dito, paso buong katawan!

May naaksidente dito, sugatan lahat! May nakuryente dito, hindi gumagalaw! May sinaksak dito, duguan siya! May binugbog dito, hindi makabangon! May granada sumabog, sugatan lahat! May barilan dito, maraming tama! Nasunog ang bahay niya kagabi, paso buong katawan. Na-trap siya sa sunog kanina, hindi nakalabas. Napasok siya ng mantika, paso braso niya. Naipit siya sa nasusunog na kotse. Nabagsakan siya ng nasusunog na kahoy. Napasok siya ng kumukulong tubig. Na-suffocate siya sa usok. Napasok siya ng apoy sa kusina. Napasok siya ng LPG na sumabog. Na-burn siya sa factory fire. May sunog dito sa mall, maraming sugatan! May tao na na-trap sa nasusunog na bahay! May paso siya, hindi humihinga! May sumabog na LPG, paso lahat ng tao! May nasusunog na kotse, may tao sa loob! May tao na paso buong katawan! May tao na na-trap sa apartment fire! May tao na na-trap sa factory fire! May tao na na-trap sa warehouse fire! May tao na paso sa kusina! Kung hindi siya madadala agad, mamamatay siya

sa paso.

Kapag hindi siya mailigtas, masusunog siya sa loob.

Kung hindi siya madadala sa ospital, lalala sugat niya.

Kapag hindi siya mailabas, masusunog siya.

Kung hindi siya madadala agad, titigil paghinga niya.

Kapag hindi siya mailigtas, masusunog buong katawan niya.

Kung hindi siya madadala, magkaka-infection sugat niya.

Kapag hindi siya madadala agad, mamamatay siya sa usok.

Kung hindi siya madadala, mawawalan siya ng pulso.

Kapag hindi siya madadala agad, mamamatay siya sa paso.

Nasunog ako, paso buong katawan ko!

Na-trap ako sa sunog, tulungan niyo ako! Napasok ako ng mantika, paso braso ko! Naipit ako sa nasusunog na kotse!

Napasok ako ng kumukulong tubig! Na-suffocate ako sa usok! Napasok ako ng apoy sa kusina! Napasok ako ng LPG na sumabog! Na-burn ako sa factory fire! Na-trap ako sa apartment fire! May tao na nasunog dito, paso buong katawan! May tao na na-trap sa sunog! May tao na paso sa kusina! May tao na paso sa factory!

May tao na paso sa warehouse! May tao na paso sa apartment! May tao na paso sa mall! May tao na paso sa simbahan! May tao na paso sa parke! May tao na paso sa palengke! Bro, paso siya, tulungan niyo! Kuya, nasunog siya, hindi gumagalaw! Sis, paso buong katawan niya! Pare, na-trap siya sa sunog! Lods, paso siya, tulong! Sh*t, nasunog siya, hindi humihinga! Help, paso siya, hindi gumagalaw! Bro, na-trap siya sa apartment fire! Kuya, paso siya sa kusina! Sis, paso siya sa factory!

Nasunog siya kanina, ngayon hindi gumagalaw, baka mamatay.

Na-trap siya kahapon, ngayon sugatan, baka lumala bukas.

Napasok siya kanina, ngayon paso buong katawan, baka hindi makaligtas.

Na-burn siya kahapon, ngayon sugatan, baka mamatay.

Na-trap siya kanina, ngayon hindi humihinga, baka mamatay agad.

Napasok siya kahapon, ngayon sugatan, baka lumala bukas.

Na-burn siya kanina, ngayon paso buong katawan, baka hindi makaligtas.

Na-trap siya kahapon, ngayon sugatan, baka

mamatay. Napasok siya kanina, ngayon sugatan, baka lumala bukas.

Na-burn siya kahapon, ngayon sugatan, baka mamatay. May tao na paso sa jeep! May tao na paso sa bus! May tao na paso sa simbahan! May tao na paso sa parke! May tao na paso sa palengke! May tao na paso sa tindahan! May tao na paso sa kusina! May tao na paso sa banyo! May tao na paso sa sala! May tao na paso sa kwarto! May tao na paso sa bubong! May tao na paso sa bakuran! May tao na paso sa kalsada! May tao na paso sa eskinita! May tao na paso sa tulay! May tao na paso sa dagat! May tao na paso sa ilog! May tao na paso sa bundok! May tao na paso sa bukid! May tao na paso sa gubat! May tao na paso sa palayan! May tao na paso sa semento! May tao na paso sa bato! May tao na paso sa putik!

May tao na paso sa buhangin! May tao na paso sa kahoy! May tao na paso sa bakal! May tao na paso sa baso! May sunog dito. Nasusunog yung bahay namin. May apoy sa building. May nasusunog na tindahan. There’s a fire near us. May fire po sa bahay namin. May umaapoy na kotse Malakas na ang apoy sa may subdivision May sunog po malapit sa palengke. Tulong, nasusunog ang katabing bahay! Kumakalat na ang apoy dito sa lugar namin. Nakakakita ako ng makapal na usok mula sa factory. May sumabog at biglang nagkaapoy dito. There is a huge fire breaking out down the street. Help, my kitchen is caught on fire! I can see heavy black smoke coming from the warehouse. The building next door is completely up in flames. Please send a firetruck immediately, there is a fire here. Sunog Nasusunog yung poste ng kuryente May malaking sunog po sa kabilang kalsada. Nasusunog na ang bubong ng kapitbahay namin.

May apoy na lumalabas sa loob ng gusali. Lumalaki na po ang apoy, kailangan ng tulong.

May nasusunog na sasakyan sa kalsada.

Makapal ang usok at may apoy sa may garahe.

Nagliyab bigla ang isang bahagi ng bahay.

May sunog sa isang apartment dito.

Mukhang may nasusunog sa loob ng establishment.

Kailangan po namin ng bumbero, may malaking apoy dito.

There is a fire inside the building.

Flames are spreading quickly in this area.

A house nearby has caught fire.

We need firefighters here immediately.

There is a vehicle on fire on the road.

Smoke and flames are coming from the garage.

A fire has started in the apartment.

The fire is getting bigger and spreading.

There appears to be a fire inside the establishment.

Emergency! Please send firefighters to this location.

May nagbanggaan. May accident dito. Naaksidente yung motor.

Dalawang kotse nagbanggaan. May collision sa highway.

May banggaan sa intersection. Two cars crashed.

There has been a car accident here. A motorcycle crashed into a car. Three vehicles have collided. There is a crash on the main road. A vehicle has hit a pole. Two motorcycles collided. There is an accident at the intersection. A truck collided with a car. There has been a collision on the highway. A vehicle crashed into a barrier. There is a road accident near our location. Multiple vehicles have crashed. A car and a motorcycle collided. There is a serious traffic accident here. Please send help, there has been a vehicle collision. May malaking banggaan dito sa kalsada. Tatlong sasakyan ang nagbanggaan. May motor na bumangga sa kotse. May aksidente sa may intersection. May sasakyang bumangga sa poste. Nagkabanggaan ang dalawang motor. May jeep at kotse na nagbanggaan. May banggaan sa gitna ng highway. Naaksidente ang isang sasakyan sa kalsada. May truck na bumangga sa kotse. May aksidente malapit sa amin. May sasakyang tumama sa barrier.

| Bumangga ang motor sa isa pang sasakyan.                                                                          |
| ----------------------------------------------------------------------------------------------------------------- |
| May malubhang banggaan sa pangunahing<br>kalsada.                                                                 |
| May nahimatay.                                                                                                    |
| May taong hindi humihinga.                                                                                        |
| May nasugatan dito.                                                                                               |
| Someone is unconscious.                                                                                           |
| May biglang bumagsak.                                                                                             |
| Need medical help.                                                                                                |
| May nangangailangan ng ambulance.                                                                                 |
| May nabagok dito humapas yung ulo sa kantuhan<br>ng mesa                                                          |
| May taong biglang nawalan ng malay.                                                                               |
| Hindi magising yung tao.                                                                                          |
| May nahulog at nasaktan.                                                                                          |
| May biglang nag-collapse dito.                                                                                    |
| Kailangan ng agarang tulong medikal.                                                                              |
| May taong hirap huminga.                                                                                          |
| May matinding pananakit at nangangailangan ng<br>tulong.                                                          |
| May pasyenteng kailangang dalhin sa ospital.                                                                      |
| Kailangan namin ng ambulansya agad.                                                                               |
| May taong nanghihina at hindi makatayo.                                                                           |
| May emergency medical situation dito.                                                                             |
| May taong biglang nagkasakit.                                                                                     |
| May nasaktan sa aksidente at kailangan ng<br>tulong.                                                              |
| May taong hindi maayos ang pakiramdam at<br>nangangailangan ng medical assistance.<br>Someone suddenly collapsed. |

| A person is having difficulty breathing.<br>Someone needs immediate medical attention. |
| -------------------------------------------------------------------------------------- |
| Please send an ambulance.                                                              |
| A person has fallen and needs medical help.                                            |
| Someone is not responding.                                                             |
| There is a person who needs urgent medical<br>assistance.                              |
| We need emergency medical responders here.                                             |
| Someone is feeling very weak and cannot stand.                                         |
| A person needs to be taken to the hospital.                                            |
| There is a medical emergency at this location.                                         |
| Someone suddenly became very ill.                                                      |
| Please send medical assistance immediately.                                            |
| A person was injured and needs help.                                                   |
| We need an ambulance as soon as possible.                                              |
| Gumuho yung building.                                                                  |
| Bumagsak yung pader.                                                                   |
| Gumuho yung bahay.                                                                     |
| The roof collapsed.                                                                    |
| May mga taong trapped sa loob.                                                         |
| May part ng building na bumagsak.                                                      |
| May bahagi ng gusali na gumuho.                                                        |
| May bumigay na bahagi ng building.                                                     |
| Gumuho ang isang bahagi ng pader.                                                      |
| Bumagsak ang bubong ng establishment.                                                  |
| May gusaling mukhang malapit nang gumuho.                                              |
| Nagkaroon ng pagguho sa loob ng building.<br>Bumigay ang poste ng isang gusali.        |

May bahagi ng bahay na biglang bumagsak. Gumuho ang isang lumang gusali. May mga debris na bumagsak mula sa building. Bumigay ang kisame at may mga taong nasa loob. May structure na nasira at maaaring bumagsak. May bahagi ng tulay na bumigay. Kailangan ng rescue, may gumuho na structure dito. Part of the building has collapsed. A wall has suddenly fallen down. The ceiling has collapsed. The structure is starting to collapse. A portion of the house has fallen. There are people trapped inside the collapsed structure. The building appears unstable and may collapse. Debris has fallen from the building. Part of the roof has caved in. A section of the bridge has collapsed. The building has suffered structural damage. A structure has partially collapsed. The support beam has failed. Please send rescue personnel, a structure has collapsed. There is a dangerous building collapse at this location. Baha dito. Binabaha kami. Mataas na yung tubig.

May mga stranded dahil sa baha. May mga taong trapped sa baha. Flooding sa barangay namin. The water is rising quickly. Tulong may nalulunod Lumalalim na ang baha dito. Hanggang tuhod na ang tubig sa kalsada. Pumasok na ang baha sa bahay namin. Mabilis na tumataas ang tubig. Hindi na madaanan ang kalsada dahil sa baha. May mga sasakyang na-stranded sa baha. May taong nangangailangan ng rescue sa binahang lugar. Umabot na sa loob ng mga bahay ang tubig. Malakas ang agos ng tubig dito. May mga residenteng hindi makalabas dahil sa baha. Umaapaw na ang ilog malapit sa amin. Lubog na sa tubig ang ilang bahagi ng kalsada. May mga taong naipit sa mataas na tubig. Kailangan namin ng rescue dahil sa pagbaha. May emergency dahil mabilis ang pagtaas ng tubig. The floodwater is getting deeper. Water has entered our house.

The road is no longer passable because of flooding. Several people are stranded by the flood. The water level is rising rapidly. There are vehicles trapped in the floodwater.

We need rescue assistance in the flooded area. The river near us is overflowing. Strong currents are flowing through the area. Residents are unable to leave because of the flooding. Parts of the road are completely underwater. People are trapped by the rising water. Please send help, the flooding is getting worse. There is severe flooding in our area. We need emergency rescue due to the flood. May emergency dito pero hindi ko alam kung ano. May kakaibang nangyayari dito. I don't know what happened but people need help. May nakita akong tao na nakahandusay. Hindi ko alam kung ano yung nangyari. May nangyaring emergency dito pero hindi malinaw kung ano. Kailangan ng tulong dito, hindi ko alam ang nangyari. May nakita akong kaguluhan pero hindi ko alam ang dahilan. May taong nangangailangan ng tulong pero hindi ko alam kung bakit. May insidente dito na hindi ko matukoy. Hindi ko alam kung anong klaseng emergency ito. May kakaibang sitwasyon dito at kailangan ng responder. May nangyari sa lugar namin pero wala akong sapat na impormasyon. Nakakita ako ng taong nakahiga sa daan at hindi ko alam ang nangyari.

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
