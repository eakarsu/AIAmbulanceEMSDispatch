require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const client = await pool.connect();

  try {
    // ── Drop tables in reverse dependency order ──────────────────────────
    const dropStatements = `
      DROP TABLE IF EXISTS mutual_aid CASCADE;
      DROP TABLE IF EXISTS qa_reviews CASCADE;
      DROP TABLE IF EXISTS exposure_tracking CASCADE;
      DROP TABLE IF EXISTS comm_logs CASCADE;
      DROP TABLE IF EXISTS protocols CASCADE;
      DROP TABLE IF EXISTS performance_metrics CASCADE;
      DROP TABLE IF EXISTS incidents CASCADE;
      DROP TABLE IF EXISTS billing CASCADE;
      DROP TABLE IF EXISTS certifications CASCADE;
      DROP TABLE IF EXISTS vehicle_maintenance CASCADE;
      DROP TABLE IF EXISTS medications CASCADE;
      DROP TABLE IF EXISTS equipment CASCADE;
      DROP TABLE IF EXISTS hospitals CASCADE;
      DROP TABLE IF EXISTS patient_care_reports CASCADE;
      DROP TABLE IF EXISTS schedules CASCADE;
      DROP TABLE IF EXISTS crew CASCADE;
      DROP TABLE IF EXISTS calls CASCADE;
      DROP TABLE IF EXISTS units CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `;
    await client.query(dropStatements);
    console.log('Dropped all existing tables.');

    // ── Run schema.sql to create tables ──────────────────────────────────
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    await client.query(schemaSql);
    console.log('Schema created successfully.');

    // ── Seed Users ───────────────────────────────────────────────────────
    const hashedPassword = await bcrypt.hash('password123', 10);
    const usersData = [
      ['admin@emsstation1.com', hashedPassword, 'David Chen', 'admin'],
      ['dispatch1@metrocountyems.com', hashedPassword, 'Sarah Mitchell', 'dispatcher'],
      ['dispatch2@metrocountyems.com', hashedPassword, 'James Rivera', 'dispatcher'],
      ['dispatch3@metrocountyems.com', hashedPassword, 'Emily Watson', 'dispatcher'],
      ['supervisor1@metrocountyems.com', hashedPassword, 'Robert Hayes', 'supervisor'],
      ['supervisor2@metrocountyems.com', hashedPassword, 'Linda Foster', 'supervisor'],
      ['meddir@metrocountyems.com', hashedPassword, 'Dr. Alan Marsh', 'medical_director'],
      ['billing@metrocountyems.com', hashedPassword, 'Karen Lopez', 'billing'],
      ['qa@metrocountyems.com', hashedPassword, 'Thomas Grant', 'qa_officer'],
      ['dispatch4@metrocountyems.com', hashedPassword, 'Maria Gonzalez', 'dispatcher'],
      ['crew1@metrocountyems.com', hashedPassword, 'Nathan Brooks', 'crew'],
      ['crew2@metrocountyems.com', hashedPassword, 'Jessica Price', 'crew'],
      ['crew3@metrocountyems.com', hashedPassword, 'Daniel Kim', 'crew'],
      ['crew4@metrocountyems.com', hashedPassword, 'Ashley Turner', 'crew'],
      ['crew5@metrocountyems.com', hashedPassword, 'Marcus Johnson', 'crew'],
    ];
    for (const u of usersData) {
      await client.query(
        `INSERT INTO users (email, password, full_name, role) VALUES ($1,$2,$3,$4)`,
        u
      );
    }
    console.log(`Seeded ${usersData.length} users.`);

    // ── Seed Units ───────────────────────────────────────────────────────
    const unitsData = [
      ['M1', 'ALS', 'available', 33.7550100, -84.3900100, 'Station 1', 'J. Thompson', 'ALS'],
      ['M2', 'ALS', 'en_route', 33.7620200, -84.3850200, 'Station 1', 'R. Patel', 'ALS'],
      ['M3', 'ALS', 'on_scene', 33.7700300, -84.3750300, 'Station 2', 'C. Martinez', 'ALS'],
      ['M4', 'ALS', 'available', 33.7480400, -84.3950400, 'Station 2', 'K. Williams', 'ALS'],
      ['M5', 'ALS', 'at_hospital', 33.7530500, -84.4000500, 'Station 3', 'A. Davis', 'ALS'],
      ['B1', 'BLS', 'available', 33.7600600, -84.3700600, 'Station 1', 'M. Brown', 'BLS'],
      ['B2', 'BLS', 'en_route', 33.7450700, -84.3800700, 'Station 3', 'L. Garcia', 'BLS'],
      ['B3', 'BLS', 'available', 33.7580800, -84.4050800, 'Station 2', 'S. Anderson', 'BLS'],
      ['E1', 'ALS', 'available', 33.7660900, -84.3650900, 'Station 1', 'D. Robinson', 'Critical Care'],
      ['E2', 'ALS', 'on_scene', 33.7720100, -84.3550100, 'Station 2', 'P. Clark', 'Critical Care'],
      ['S1', 'Supervisor', 'available', 33.7560200, -84.3870200, 'Station 1', 'R. Hayes', 'ALS'],
      ['S2', 'Supervisor', 'available', 33.7650300, -84.3780300, 'Station 2', 'L. Foster', 'ALS'],
      ['F1', 'Fly Car', 'available', 33.7500400, -84.3920400, 'Station 1', 'Dr. A. Marsh', 'Critical Care'],
      ['M6', 'ALS', 'out_of_service', 33.7430500, -84.3860500, 'Station 3', 'T. Wilson', 'ALS'],
      ['B4', 'BLS', 'available', 33.7690600, -84.3600600, 'Station 3', 'N. Taylor', 'BLS'],
    ];
    for (const u of unitsData) {
      await client.query(
        `INSERT INTO units (unit_number, unit_type, status, current_lat, current_lng, station, crew_lead, capability_level)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        u
      );
    }
    console.log(`Seeded ${unitsData.length} units.`);

    // ── Seed Calls ───────────────────────────────────────────────────────
    const callsData = [
      ['MC-2026-0001','Cardiac Arrest',1,'dispatched','Maria Sanchez','555-0101','John Doe',72,'Male','142 Oak Street, Metro City','33.7551000','-84.3901000','Unresponsive, not breathing','71-year-old male found unresponsive by wife. CPR in progress.',2],
      ['MC-2026-0002','MVA - Multi Vehicle',1,'en_route','911 Caller','555-0102','Unknown',null,null,'I-85 Northbound at Exit 42, Metro City','33.7625000','-84.3855000','Multi-vehicle accident with entrapment','3-car pileup on I-85, one person trapped, two walking wounded.',3],
      ['MC-2026-0003','Fall',3,'on_scene','Pine Valley Nursing','555-0103','Dorothy Whitfield',84,'Female','89 Pine Valley Dr, Metro City','33.7702000','-84.3752000','Hip pain after fall','Elderly female fell from bed, complaining of left hip pain.',4],
      ['MC-2026-0004','Chest Pain',2,'transporting','Patient Self','555-0104','Robert Franklin',58,'Male','310 Magnolia Blvd, Metro City','33.7485000','-84.3955000','Crushing chest pain radiating to left arm','58yo male with hx of MI, diaphoretic, pain 8/10.',5],
      ['MC-2026-0005','Difficulty Breathing',2,'dispatched','Angela Torres','555-0105','Miguel Torres',4,'Male','27 Cedar Lane, Metro City','33.7535000','-84.4005000','4yo with severe respiratory distress','Child with known asthma, albuterol not relieving symptoms. Audible wheezing.',7],
      ['MC-2026-0006','Stroke Symptoms',1,'en_route','Donna Webb','555-0106','Harold Webb',67,'Male','55 Birch Avenue, Metro City','33.7605000','-84.3705000','Sudden onset facial droop and slurred speech','Symptom onset approximately 45 minutes ago. FAST positive.',1],
      ['MC-2026-0007','Overdose',2,'on_scene','Bystander','555-0107','Unknown',28,'Male','412 River St, Metro City','33.7455000','-84.3805000','Found unresponsive with drug paraphernalia','Agonal breathing, pinpoint pupils, cyanotic.',6],
      ['MC-2026-0008','Abdominal Pain',3,'completed','Patient Self','555-0108','Sarah Jennings',34,'Female','1800 Peachtree Rd, Metro City','33.7585000','-84.4055000','Severe lower right abdominal pain','Pain started 6 hours ago, nausea and vomiting, low-grade fever.',8],
      ['MC-2026-0009','Seizure',2,'transporting','School Nurse','555-0109','Tyler Adams',12,'Male','Metro County Middle School, 500 School Rd','33.7665000','-84.3655000','Active seizure > 5 minutes','No known seizure history, seizure ongoing for 7 minutes.',9],
      ['MC-2026-0010','Allergic Reaction',2,'on_scene','Restaurant Manager','555-0110','Diana Ross',42,'Female','The Metro Grill, 220 Main St','33.7725000','-84.3555000','Anaphylaxis after eating shellfish','Throat swelling, hives, patient used EpiPen prior to call.',10],
      ['MC-2026-0011','Diabetic Emergency',3,'dispatched','Coworker','555-0111','Frank Peters',55,'Male','Metro Corp Tower, 100 Business Park Dr','33.7565000','-84.3875000','Found confused and diaphoretic at work','Known diabetic, missed lunch, blood sugar reads 42.',1],
      ['MC-2026-0012','Stabbing',1,'en_route','Bystander','555-0112','Unknown',22,'Male','Corner of 5th and Main, Metro City','33.7655000','-84.3785000','Stab wound to left chest','Single stab wound, conscious but deteriorating. PD on scene.',2],
      ['MC-2026-0013','Pediatric Fever',4,'completed','Mother','555-0113','Emma Collins',2,'Female','78 Willow Creek Ct, Metro City','33.7505000','-84.3925000','High fever unresponsive to Tylenol','Temp 104.2, febrile seizure 20 min ago, now post-ictal.',3],
      ['MC-2026-0014','Back Pain - Lift Assist',4,'pending','Home Health Nurse','555-0114','George Mitchell',78,'Male','16 Sunset Terrace, Metro City','33.7435000','-84.3865000','Elderly male fell and cannot get up','No injury apparent, needs lift assist. Patient is 280 lbs.',null],
      ['MC-2026-0015','Burns',2,'dispatched','Fire Dispatch','555-0115','Unknown',35,'Male','Metro Auto Body, 940 Industrial Blvd','33.7695000','-84.3605000','Chemical burn to face and arms','Flash fire from chemical splash, partial thickness burns estimated 15% BSA.',11],
      ['MC-2026-0016','Psychiatric Emergency',3,'on_scene','Police','555-0116','Lisa Monroe',30,'Female','425 Elm Street, Metro City','33.7540000','-84.3940000','Suicidal ideation with plan','Patient barricaded in bathroom, PD on scene requesting EMS standby.',12],
    ];
    for (const c of callsData) {
      await client.query(
        `INSERT INTO calls (call_number,call_type,priority,status,caller_name,caller_phone,patient_name,patient_age,patient_gender,location_address,location_lat,location_lng,chief_complaint,description,assigned_unit_id,dispatch_time)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,CURRENT_TIMESTAMP - interval '1 hour' * (random()*5)::int)`,
        c
      );
    }
    console.log(`Seeded ${callsData.length} calls.`);

    // ── Seed Crew ────────────────────────────────────────────────────────
    const crewData = [
      ['EMP-001','Jason','Thompson','Paramedic','Paramedic','2027-06-15','555-1001','jthompson@metrocountyems.com','2018-03-01',1,'active',36.0,12.0,'low'],
      ['EMP-002','Raj','Patel','Paramedic','Paramedic','2027-08-20','555-1002','rpatel@metrocountyems.com','2019-07-15',2,'active',40.0,8.0,'moderate'],
      ['EMP-003','Carlos','Martinez','Paramedic','Paramedic','2026-12-01','555-1003','cmartinez@metrocountyems.com','2017-01-10',3,'active',44.0,16.0,'moderate'],
      ['EMP-004','Karen','Williams','EMT-B','EMT-Basic','2027-03-30','555-1004','kwilliams@metrocountyems.com','2021-05-20',4,'active',24.0,8.0,'low'],
      ['EMP-005','Andre','Davis','Paramedic','Paramedic','2027-11-10','555-1005','adavis@metrocountyems.com','2016-09-01',5,'active',38.0,14.0,'low'],
      ['EMP-006','Michelle','Brown','EMT-B','EMT-Basic','2027-04-15','555-1006','mbrown@metrocountyems.com','2022-01-15',6,'active',32.0,8.0,'low'],
      ['EMP-007','Luis','Garcia','EMT-A','EMT-Advanced','2026-10-25','555-1007','lgarcia@metrocountyems.com','2020-06-10',7,'active',40.0,12.0,'moderate'],
      ['EMP-008','Stephanie','Anderson','EMT-B','EMT-Basic','2027-07-01','555-1008','sanderson@metrocountyems.com','2023-02-01',8,'active',28.0,4.0,'low'],
      ['EMP-009','Derek','Robinson','Paramedic','Paramedic','2027-09-15','555-1009','drobinson@metrocountyems.com','2015-11-20',9,'active',48.0,20.0,'high'],
      ['EMP-010','Patricia','Clark','Paramedic','Paramedic','2026-06-30','555-1010','pclark@metrocountyems.com','2018-08-05',10,'active',42.0,18.0,'high'],
      ['EMP-011','Robert','Hayes','Supervisor','Paramedic','2027-05-01','555-1011','rhayes@metrocountyems.com','2012-04-15',11,'active',36.0,12.0,'low'],
      ['EMP-012','Linda','Foster','Supervisor','Paramedic','2027-01-20','555-1012','lfoster@metrocountyems.com','2013-10-01',12,'active',34.0,10.0,'low'],
      ['EMP-013','Tommy','Wilson','Paramedic','Paramedic','2026-08-15','555-1013','twilson@metrocountyems.com','2020-02-01',null,'on_leave',0,0,'low'],
      ['EMP-014','Nicole','Taylor','EMT-B','EMT-Basic','2027-02-28','555-1014','ntaylor@metrocountyems.com','2022-09-15',15,'active',30.0,6.0,'low'],
      ['EMP-015','Brian','Moore','Driver','Driver','2027-12-31','555-1015','bmoore@metrocountyems.com','2021-11-01',1,'active',36.0,12.0,'low'],
      ['EMP-016','Samantha','Lee','EMT-A','EMT-Advanced','2027-04-30','555-1016','slee@metrocountyems.com','2019-03-20',2,'active',38.0,10.0,'low'],
    ];
    for (const c of crewData) {
      await client.query(
        `INSERT INTO crew (employee_id,first_name,last_name,role,certification_level,certification_expiry,phone,email,hire_date,assigned_unit_id,status,hours_this_week,consecutive_hours,fatigue_risk_level)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        c
      );
    }
    console.log(`Seeded ${crewData.length} crew members.`);

    // ── Seed Schedules ───────────────────────────────────────────────────
    const schedulesData = [];
    for (let i = 1; i <= 16; i++) {
      const shiftTypes = ['12hr', '24hr', '12hr', '24hr', '48hr'];
      const shiftType = shiftTypes[i % shiftTypes.length];
      const unitId = i <= 15 ? i : 1;
      const statuses = ['scheduled', 'active', 'completed', 'active', 'scheduled'];
      schedulesData.push([i, shiftType, unitId, statuses[i % statuses.length]]);
    }
    for (const s of schedulesData) {
      const hours = s[1] === '12hr' ? 12 : s[1] === '24hr' ? 24 : 48;
      await client.query(
        `INSERT INTO schedules (crew_id, shift_type, shift_start, shift_end, assigned_unit_id, status)
         VALUES ($1, $2, CURRENT_TIMESTAMP - interval '2 hours', CURRENT_TIMESTAMP + interval '${hours} hours', $3, $4)`,
        [s[0], s[1], s[2], s[3]]
      );
    }
    console.log(`Seeded ${schedulesData.length} schedules.`);

    // ── Seed Hospitals ───────────────────────────────────────────────────
    const hospitalsData = [
      ['Metro General Hospital','500 Hospital Pkwy, Metro City',33.7580000,-84.3880000,'555-2001','open','Level I',true,true,false,false,42,18],
      ['St. Mary\'s Medical Center','1200 Faith Ave, Metro City',33.7650000,-84.3750000,'555-2002','open','Level II',true,true,false,true,28,25],
      ['Metro Children\'s Hospital','800 Pediatric Way, Metro City',33.7710000,-84.3700000,'555-2003','open','Level II',false,false,false,true,35,12],
      ['Riverside Community Hospital','300 River Rd, Metro City',33.7460000,-84.3820000,'555-2004','diversion','Level III',false,false,false,false,8,45],
      ['Metro Burn Center','150 Specialist Blvd, Metro City',33.7530000,-84.4020000,'555-2005','open','Level I',false,false,true,false,15,10],
      ['Northside Medical Center','2100 North Pkwy, Metro City',33.7800000,-84.3650000,'555-2006','open','Level II',true,false,false,false,52,15],
      ['Southside Regional Medical','450 South Main, Metro City',33.7380000,-84.3900000,'555-2007','open','Level III',false,false,false,false,20,30],
      ['Metro University Hospital','600 University Dr, Metro City',33.7620000,-84.3790000,'555-2008','open','Level I',true,true,true,true,60,22],
      ['Pine Hills Psychiatric Center','90 Serenity Ln, Metro City',33.7550000,-84.4100000,'555-2009','open','None',false,false,false,false,30,5],
      ['VA Metro Medical Center','1000 Veterans Blvd, Metro City',33.7490000,-84.3950000,'555-2010','open','Level II',true,true,false,false,38,20],
      ['Eastside Community Clinic','720 East Ave, Metro City',33.7600000,-84.3550000,'555-2011','open','None',false,false,false,false,10,40],
      ['Lakeview Rehabilitation Hospital','55 Lakeview Dr, Metro City',33.7440000,-84.3750000,'555-2012','open','None',false,false,false,false,45,0],
      ['Metro Heart Institute','880 Cardiac Ct, Metro City',33.7670000,-84.3830000,'555-2013','open','Level II',false,true,false,false,22,8],
      ['Crestwood Memorial Hospital','1500 Memorial Dr, Metro City',33.7750000,-84.3600000,'555-2014','open','Level III',true,false,false,false,18,35],
      ['Peachtree Surgical Center','200 Peachtree Rd, Metro City',33.7520000,-84.3870000,'555-2015','closed','None',false,false,false,false,0,0],
    ];
    for (const h of hospitalsData) {
      await client.query(
        `INSERT INTO hospitals (name,address,lat,lng,phone,er_status,trauma_level,stroke_center,cardiac_center,burn_center,pediatric_center,available_beds,er_wait_minutes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        h
      );
    }
    console.log(`Seeded ${hospitalsData.length} hospitals.`);

    // ── Seed Patient Care Reports ────────────────────────────────────────
    const pcrData = [
      ['PCR-2026-0001',1,'John Doe','1954-03-12',72,'Male',185.0,'NKDA','Metoprolol, Aspirin, Lisinopril','CAD, HTN, prior MI','Unresponsive, not breathing','72yo M found unresponsive. CPR initiated by wife. AED advised shock x1.','160/90','0','0','78','97.2','3','CPR, Defibrillation x3, IV access','Advanced airway - King LT','Epinephrine 1mg IV x3, Amiodarone 300mg IV','Transported - Lights and Sirens','Metro General Hospital','Dr. Reynolds','J. Thompson','J. Thompson, B. Moore'],
      ['PCR-2026-0002',2,'Mark Stevens','1990-05-22',35,'Male',190.5,'Penicillin','None','None','Chest wall pain, laceration to forehead','35yo M, restrained driver in 3-car MVC. +LOC. GCS 14.','138/82','98','20','96','98.0','14','C-collar, long board, wound care','IV access','Normal Saline 500ml','Transported - Lights and Sirens','Metro General Hospital','Dr. Pham','R. Patel','R. Patel, S. Lee'],
      ['PCR-2026-0003',3,'Dorothy Whitfield','1942-01-08',84,'Female',145.0,'Sulfa drugs','Amlodipine, Metformin, Calcium','Osteoporosis, DM2, HTN','Left hip pain after fall','84yo F fell from bed at nursing facility. Pain 7/10 left hip.','148/78','88','18','95','97.8','15','Splinting, pain management','IV access','Morphine 4mg IV','Transported - No Lights/Sirens','Riverside Community Hospital','Dr. Kim','C. Martinez','C. Martinez, K. Williams (student)'],
      ['PCR-2026-0004',4,'Robert Franklin','1968-09-30',58,'Male',210.0,'NKDA','Aspirin 81mg, Atorvastatin, Metoprolol','MI x2, CABG 2022, HTN, HLD','Crushing substernal chest pain 8/10','58yo M hx CAD, acute onset CP while mowing lawn. Diaphoretic.','178/104','110','22','93','98.6','15','12-lead ECG (STEMI noted), O2 NRB','IV access x2','Aspirin 324mg PO, NTG 0.4mg SL x2, Morphine 2mg IV, Heparin 5000u IV','Transported - Lights and Sirens','Metro Heart Institute','Dr. Sanders','K. Williams','K. Williams, A. Davis'],
      ['PCR-2026-0005',5,'Miguel Torres','2022-06-15',4,'Male',18.0,'NKDA','Albuterol PRN','Asthma','Severe respiratory distress','4yo M with known asthma, triggered by URI. Albuterol at home ineffective.','N/A','140','36','88','100.4','15','Blow-by O2, continuous neb','None','Albuterol 2.5mg neb x2, Ipratropium 0.5mg neb','Transported - Lights and Sirens','Metro Children\'s Hospital','Dr. Okafor','A. Davis','A. Davis, M. Brown'],
      ['PCR-2026-0006',6,'Harold Webb','1959-04-18',67,'Male',195.0,'NKDA','Warfarin, Metoprolol, Lisinopril','AFib, HTN','Sudden facial droop, slurred speech','67yo M with acute stroke symptoms. FAST positive. Onset 45 min ago.','168/96','92','16','97','98.2','14','Large bore IV, rapid transport, stroke alert called','IV access','None - tPA candidate at facility','Transported - Lights and Sirens','Metro General Hospital','Dr. Gupta','M. Brown','M. Brown, L. Garcia'],
      ['PCR-2026-0007',7,'James Walker','1998-02-14',28,'Male',165.0,'Unknown','Unknown','Unknown','Unresponsive, suspected opioid overdose','28yo M found unresponsive in alley. Agonal respirations, pinpoint pupils.','90/60','52','6','72','96.8','7','BVM ventilation, Narcan','IV access, NPA','Naloxone 2mg IN, Naloxone 2mg IV','Patient responsive - transported','Riverside Community Hospital','Dr. Kim','L. Garcia','L. Garcia, S. Anderson'],
      ['PCR-2026-0008',8,'Sarah Jennings','1992-08-05',34,'Female',140.0,'Codeine','Oral contraceptive','Appendectomy age 12','Severe RLQ abdominal pain','34yo F with acute onset RLQ pain, nausea, vomiting, temp 100.8F.','122/76','96','18','98','100.8','15','Position of comfort, emesis bag','IV access','Ondansetron 4mg IV, NS 500ml bolus','Transported - No Lights/Sirens','Northside Medical Center','Dr. Bennett','S. Anderson','S. Anderson, B. Moore'],
      ['PCR-2026-0009',9,'Tyler Adams','2014-01-20',12,'Male',95.0,'NKDA','None','None','Active generalized seizure > 5 min','12yo M, new onset seizure at school. No hx epilepsy. Seizure 7 min.','100/64','130','8','91','101.2','8','Suction, seizure precautions, O2','IV access','Midazolam 5mg IM (buccal), NS 250ml','Transported - Lights and Sirens','Metro Children\'s Hospital','Dr. Okafor','D. Robinson','D. Robinson, N. Taylor'],
      ['PCR-2026-0010',10,'Diana Ross','1984-07-22',42,'Female',155.0,'Shellfish, Iodine','Lisinopril','Shellfish allergy (known)','Anaphylaxis','42yo F ate shrimp unknowingly. Used personal EpiPen. Throat swelling.','88/54','128','26','92','98.4','15','O2 NRB, 2 large bore IVs','IV access x2','Epinephrine 0.3mg IM, Diphenhydramine 50mg IV, Methylprednisolone 125mg IV, NS 1L bolus','Transported - Lights and Sirens','Metro General Hospital','Dr. Reynolds','P. Clark','P. Clark, D. Robinson'],
      ['PCR-2026-0011',11,'Frank Peters','1971-11-03',55,'Male',220.0,'NKDA','Metformin, Glipizide, Lisinopril','DM2, HTN','Altered mental status, diaphoretic','55yo M found confused at desk. Known DM2, missed lunch. BGL 42.','110/70','108','20','97','97.6','13','Oral glucose initially, then IV','IV access','D50 25g IV, repeat BGL 128 at 10 min','Patient refused transport - AMA','N/A','N/A','R. Hayes','R. Hayes, L. Foster'],
      ['PCR-2026-0012',12,'Marcus Taylor','2004-03-15',22,'Male',175.0,'NKDA','None','None','Stab wound left chest','22yo M with single stab wound to left anterior chest. Conscious.','86/52','132','28','89','97.0','13','Occlusive dressing, bilateral decomp assessed, rapid transport','IV access x2, chest seal','NS 2L wide open','Transported - Lights and Sirens','Metro General Hospital','Dr. Pham','R. Patel','R. Patel, S. Lee, PD escort'],
      ['PCR-2026-0013',13,'Emma Collins','2024-04-10',2,'Female',12.5,'NKDA','None','None','Febrile seizure','2yo F, temp 104.2. Seizure at home ~3 min, now post-ictal.','N/A','150','30','96','104.2','12','Passive cooling, O2 blow-by','None','Acetaminophen 120mg PR','Transported - Lights and Sirens','Metro Children\'s Hospital','Dr. Okafor','C. Martinez','C. Martinez, M. Brown'],
      ['PCR-2026-0014',14,'George Mitchell','1948-06-25',78,'Male',127.0,'NKDA','Donepezil, Metoprolol','Dementia, CHF, AFib','Lift assist - no injury','78yo M slid from wheelchair. No injury, needs lift assist.','136/82','78','16','96','97.4','15','Lift assist, vitals assessment','None','None','Refused transport','N/A','N/A','L. Foster','L. Foster, N. Taylor'],
      ['PCR-2026-0015',15,'David Hernandez','1991-05-09',35,'Male',180.0,'NKDA','None','None','Chemical burn face and arms','35yo M, chemical splash at auto body shop. Partial thickness burns ~15% BSA.','142/88','112','24','95','98.8','14','Copious irrigation x20 min, dry sterile dressings, pain mgmt','IV access x2','Morphine 6mg IV, NS 1L','Transported - Lights and Sirens','Metro Burn Center','Dr. Holloway','A. Davis','A. Davis, B. Moore'],
    ];
    for (const p of pcrData) {
      await client.query(
        `INSERT INTO patient_care_reports (pcr_number,call_id,patient_name,patient_dob,patient_age,patient_gender,patient_weight,allergies,medications,medical_history,chief_complaint,narrative,vitals_bp,vitals_hr,vitals_rr,vitals_spo2,vitals_temp,vitals_gcs,treatments_given,procedures,medications_administered,transport_disposition,receiving_facility,receiving_physician,crew_lead,crew_members,status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,'completed')`,
        p
      );
    }
    console.log(`Seeded ${pcrData.length} patient care reports.`);

    // ── Seed Equipment ───────────────────────────────────────────────────
    const equipmentData = [
      ['Cardiac Monitor/Defibrillator - Zoll X Series','Medical',1,'ZX-2023-0451','operational','2026-02-15','2026-08-15',1,null],
      ['Cardiac Monitor/Defibrillator - Zoll X Series','Medical',2,'ZX-2023-0452','operational','2026-02-15','2026-08-15',1,null],
      ['Stryker Power-PRO XT Stretcher','Medical',1,'SP-2022-1100','operational','2026-03-01','2026-09-01',1,null],
      ['Stryker Power-PRO XT Stretcher','Medical',3,'SP-2022-1101','needs_repair','2026-01-20','2026-07-20',1,'Hydraulic lift intermittent failure'],
      ['Lucas 3 Chest Compression Device','Medical',9,'LC3-2024-0088','operational','2026-03-10','2026-09-10',1,null],
      ['Portable Suction Unit - SSCOR','Medical',1,'SS-2021-3322','operational','2026-02-28','2026-08-28',1,null],
      ['King Vision Video Laryngoscope','Medical',5,'KV-2023-0199','operational','2026-01-15','2026-07-15',1,null],
      ['Motorola APX 8000 Portable Radio','Communication',1,'MR-2022-5501','operational','2026-03-15','2027-03-15',2,null],
      ['Motorola APX 8000 Portable Radio','Communication',2,'MR-2022-5502','operational','2026-03-15','2027-03-15',2,null],
      ['Stair Chair - Stryker 6253','Medical',6,'SC-2021-8801','operational','2026-02-01','2026-08-01',1,null],
      ['AED - Zoll AED 3','Medical',15,'AED-2024-0033','operational','2026-03-05','2026-09-05',1,null],
      ['Scoop Stretcher','Safety',4,'SS-2020-4477','operational','2026-01-10','2026-07-10',1,null],
      ['Pediatric Broselow Kit','Medical',7,'BK-2023-0900','operational','2026-03-01','2026-06-01',1,'Check medication expiry dates'],
      ['Pulse Oximeter - Masimo Rad-57','Medical',3,'MO-2022-7712','operational','2026-02-20','2026-08-20',2,null],
      ['IV Pump - Alaris 8015','Medical',9,'AP-2023-1155','operational','2026-03-12','2026-09-12',1,null],
      ['Toughbook Laptop - ePCR','Communication',1,'TB-2024-0021','operational','2026-03-01','2027-03-01',1,null],
    ];
    for (const e of equipmentData) {
      await client.query(
        `INSERT INTO equipment (name,category,unit_id,serial_number,status,last_inspected,next_inspection_due,quantity,notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        e
      );
    }
    console.log(`Seeded ${equipmentData.length} equipment items.`);

    // ── Seed Medications ─────────────────────────────────────────────────
    const medsData = [
      ['Epinephrine 1:10,000','Sympathomimetic','Schedule VI',1,20.0,'mg','LOT-2026-A001','2027-03-01',false,'2026-03-20','J. Thompson','in_stock'],
      ['Epinephrine 1:1,000 (auto-injector)','Sympathomimetic','Schedule VI',1,3.0,'units','LOT-2026-A002','2027-01-15',false,'2026-03-20','J. Thompson','in_stock'],
      ['Amiodarone 150mg/3ml','Antiarrhythmic','Schedule VI',1,6.0,'units','LOT-2026-B001','2027-06-01',false,'2026-03-20','J. Thompson','in_stock'],
      ['Morphine Sulfate 10mg/ml','Opioid Analgesic','Schedule II',2,5.0,'units','LOT-2025-C001','2026-12-01',true,'2026-03-20','R. Patel','in_stock'],
      ['Fentanyl 100mcg/2ml','Opioid Analgesic','Schedule II',3,5.0,'units','LOT-2025-C002','2026-11-15',true,'2026-03-20','C. Martinez','in_stock'],
      ['Midazolam 5mg/ml','Benzodiazepine','Schedule IV',1,4.0,'units','LOT-2026-D001','2027-04-01',true,'2026-03-20','J. Thompson','in_stock'],
      ['Naloxone (Narcan) 2mg/2ml','Opioid Antagonist','OTC',7,10.0,'units','LOT-2026-E001','2027-09-01',false,'2026-03-20','L. Garcia','in_stock'],
      ['Albuterol 2.5mg/3ml Neb','Bronchodilator','OTC',5,20.0,'units','LOT-2026-F001','2027-05-01',false,'2026-03-20','A. Davis','in_stock'],
      ['Aspirin 324mg','Antiplatelet','OTC',4,30.0,'tablets','LOT-2026-G001','2028-01-01',false,'2026-03-20','K. Williams','in_stock'],
      ['Nitroglycerin 0.4mg SL','Vasodilator','Schedule VI',2,25.0,'tablets','LOT-2026-H001','2026-09-01',false,'2026-03-20','R. Patel','in_stock'],
      ['Ondansetron (Zofran) 4mg','Antiemetic','Schedule VI',8,10.0,'units','LOT-2026-I001','2027-07-01',false,'2026-03-20','S. Anderson','in_stock'],
      ['Dextrose 50% (D50)','Glucose','OTC',1,4.0,'units','LOT-2026-J001','2027-02-01',false,'2026-03-20','J. Thompson','in_stock'],
      ['Normal Saline 1000ml','IV Fluid','OTC',1,10.0,'units','LOT-2026-K001','2028-06-01',false,'2026-03-20','J. Thompson','in_stock'],
      ['Diphenhydramine 50mg/ml','Antihistamine','OTC',3,6.0,'units','LOT-2026-L001','2027-08-01',false,'2026-03-20','C. Martinez','in_stock'],
      ['Methylprednisolone 125mg','Corticosteroid','Schedule VI',10,4.0,'units','LOT-2026-M001','2027-03-15',false,'2026-03-20','P. Clark','in_stock'],
      ['Ketamine 500mg/10ml','Dissociative Anesthetic','Schedule III',9,3.0,'units','LOT-2025-N001','2026-08-01',true,'2026-03-20','D. Robinson','low'],
    ];
    for (const m of medsData) {
      await client.query(
        `INSERT INTO medications (name,drug_class,schedule,unit_id,quantity,unit_measure,lot_number,expiration_date,controlled_substance,last_count_date,last_count_by,status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        m
      );
    }
    console.log(`Seeded ${medsData.length} medications.`);

    // ── Seed Vehicle Maintenance ─────────────────────────────────────────
    const maintData = [
      [1,'Oil Change','Synthetic oil change and filter',null,'2026-03-01',52340,85.00,'Metro Fleet Services','completed','2026-06-01',55340,null],
      [2,'Tire Rotation','Rotate and balance all tires',null,'2026-02-15',48200,60.00,'Metro Fleet Services','completed','2026-08-15',54200,null],
      [3,'Brake Service','Front brake pad replacement','2026-04-01',null,61500,320.00,'Metro Fleet Services','scheduled',null,null,null],
      [4,'Annual Inspection','State DOT annual inspection',null,'2026-01-10',44800,150.00,'State DOT','completed','2027-01-10',null,null],
      [5,'Transmission Service','Transmission fluid flush','2026-04-15',null,58900,250.00,'Metro Fleet Services','scheduled',null,null,null],
      [6,'Oil Change','Synthetic oil change and filter',null,'2026-03-10',39200,85.00,'Metro Fleet Services','completed','2026-06-10',42200,null],
      [7,'Battery Replacement','Replace main battery and test charging system',null,'2026-02-28',51000,220.00,'Metro Fleet Services','completed','2028-02-28',null,null],
      [8,'Tire Replacement','Replace all four tires - Goodyear G647','2026-03-25',null,47600,1200.00,'Metro Fleet Services','scheduled',null,null,'Tires showing uneven wear'],
      [9,'Oxygen System Service','Inspect and certify on-board O2 delivery system',null,'2026-03-05',55800,175.00,'MedEquip Specialists','completed','2026-09-05',null,null],
      [10,'Stretcher Maintenance','Annual stretcher hydraulic service',null,'2026-03-12',49300,350.00,'Stryker Service','completed','2027-03-12',null,null],
      [11,'Oil Change','Synthetic oil change and filter','2026-04-01',null,38600,85.00,'Metro Fleet Services','scheduled','2026-07-01',41600,null],
      [12,'AC System Repair','AC compressor replacement',null,'2026-03-18',42100,890.00,'Metro Fleet Services','in_progress',null,null,'Parts on order'],
      [13,'Annual Inspection','State DOT annual inspection','2026-05-01',null,31200,150.00,'State DOT','scheduled','2027-05-01',null,null],
      [14,'Engine Diagnostic','Check engine light - diagnostic scan','2026-03-20',null,67200,0.00,'Metro Fleet Services','scheduled',null,null,'Unit currently OOS'],
      [15,'Oil Change','Synthetic oil change and filter',null,'2026-03-08',35900,85.00,'Metro Fleet Services','completed','2026-06-08',38900,null],
    ];
    for (const m of maintData) {
      await client.query(
        `INSERT INTO vehicle_maintenance (unit_id,maintenance_type,description,scheduled_date,completed_date,mileage,cost,vendor,status,next_due_date,next_due_mileage,notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        m
      );
    }
    console.log(`Seeded ${maintData.length} vehicle maintenance records.`);

    // ── Seed Certifications ──────────────────────────────────────────────
    const certsData = [
      [1,'Paramedic','P-GA-88201','Georgia Office of EMS','2023-06-15','2027-06-15','active',48.0,60.0],
      [1,'ACLS','ACLS-44012','American Heart Association','2024-09-01','2026-09-01','active',0,0],
      [2,'Paramedic','P-GA-91455','Georgia Office of EMS','2023-08-20','2027-08-20','active',52.0,60.0],
      [2,'PALS','PALS-55034','American Heart Association','2024-07-10','2026-07-10','active',0,0],
      [3,'Paramedic','P-GA-76890','Georgia Office of EMS','2022-12-01','2026-12-01','active',55.0,60.0],
      [4,'EMT-B','E-GA-10234','Georgia Office of EMS','2023-03-30','2027-03-30','active',20.0,40.0],
      [5,'Paramedic','P-GA-65432','Georgia Office of EMS','2023-11-10','2027-11-10','active',44.0,60.0],
      [5,'PHTLS','PHTLS-78021','NAEMT','2024-05-15','2028-05-15','active',0,0],
      [6,'EMT-B','E-GA-11890','Georgia Office of EMS','2023-04-15','2027-04-15','active',18.0,40.0],
      [7,'EMT-A','EA-GA-30122','Georgia Office of EMS','2022-10-25','2026-10-25','active',38.0,48.0],
      [9,'Paramedic','P-GA-54009','Georgia Office of EMS','2023-09-15','2027-09-15','active',58.0,60.0],
      [9,'ACLS','ACLS-44098','American Heart Association','2025-01-10','2027-01-10','active',0,0],
      [10,'Paramedic','P-GA-60211','Georgia Office of EMS','2022-06-30','2026-06-30','pending_renewal',60.0,60.0],
      [11,'Paramedic','P-GA-42100','Georgia Office of EMS','2023-05-01','2027-05-01','active',50.0,60.0],
      [15,'Driver','DRV-GA-77890','Georgia DDS','2023-12-31','2027-12-31','active',8.0,16.0],
      [16,'EMT-A','EA-GA-30555','Georgia Office of EMS','2023-04-30','2027-04-30','active',30.0,48.0],
    ];
    for (const c of certsData) {
      await client.query(
        `INSERT INTO certifications (crew_id,certification_type,certification_number,issuing_authority,issue_date,expiry_date,status,ce_hours_completed,ce_hours_required)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        c
      );
    }
    console.log(`Seeded ${certsData.length} certifications.`);

    // ── Seed Billing ─────────────────────────────────────────────────────
    const billingData = [
      [1,1,'John Doe','Medicare','Medicare','1EG4-TE5-MK72','ALS Emergency',8.2,1200.00,131.20,245.00,1576.20,0.00,1576.20,'submitted','2026-03-20',null,null],
      [2,2,'Mark Stevens','Private','BlueCross BlueShield','BCB-9981234','ALS Emergency',5.5,1200.00,88.00,180.00,1468.00,0.00,1468.00,'pending',null,null,null],
      [3,3,'Dorothy Whitfield','Medicare','Medicare','1EG9-HH2-PL88','BLS Emergency',3.8,900.00,60.80,95.00,1055.80,1055.80,0.00,'paid','2026-03-05','2026-03-18',null],
      [4,4,'Robert Franklin','Private','Aetna','AET-44512890','ALS Emergency',6.1,1200.00,97.60,320.00,1617.60,0.00,1617.60,'submitted','2026-03-21',null,null],
      [5,5,'Miguel Torres','Medicaid','Medicaid','MCD-GA-112233','ALS Emergency',4.2,1200.00,67.20,150.00,1417.20,0.00,1417.20,'submitted','2026-03-19',null,null],
      [6,6,'Harold Webb','Medicare','Medicare','1EG4-WB3-NR41','ALS Emergency',3.1,1200.00,49.60,110.00,1359.60,0.00,1359.60,'pending',null,null,null],
      [7,7,'James Walker','Self-Pay',null,null,'ALS Emergency',4.6,1200.00,73.60,275.00,1548.60,0.00,1548.60,'pending',null,null,'Patient uninsured'],
      [8,8,'Sarah Jennings','Private','United Healthcare','UHC-55789012','BLS Emergency',5.9,900.00,94.40,85.00,1079.40,1079.40,0.00,'paid','2026-03-10','2026-03-20',null],
      [9,9,'Tyler Adams','Private','Cigna','CIG-33456789','ALS Emergency',4.8,1200.00,76.80,200.00,1476.80,0.00,1476.80,'submitted','2026-03-22',null,null],
      [10,10,'Diana Ross','Private','BlueCross BlueShield','BCB-7745621','ALS Emergency',3.5,1200.00,56.00,385.00,1641.00,0.00,1641.00,'submitted','2026-03-21',null,null],
      [12,12,'Marcus Taylor','Self-Pay',null,null,'ALS Emergency',2.8,1200.00,44.80,410.00,1654.80,0.00,1654.80,'pending',null,null,'Trauma - possible collections'],
      [13,13,'Emma Collins','Private','Aetna','AET-22109876','ALS Emergency',5.0,1200.00,80.00,60.00,1340.00,0.00,1340.00,'submitted','2026-03-18',null,null],
      [14,14,'George Mitchell','Medicare','Medicare','1EG7-MT4-QR55','BLS Non-Emergency',0.0,450.00,0.00,0.00,450.00,450.00,0.00,'paid','2026-03-15','2026-03-22','Lift assist only - patient refused transport'],
      [15,15,'David Hernandez','Workers Comp','State Workers Comp Fund','WC-GA-2026-8891','ALS Emergency',7.3,1200.00,116.80,290.00,1606.80,0.00,1606.80,'submitted','2026-03-22',null,'Workplace injury - employer notified'],
      [16,null,'Transfer Patient','Medicare','Medicare','1EG2-TP9-BB10','BLS Non-Emergency',12.5,750.00,200.00,45.00,995.00,995.00,0.00,'paid','2026-03-01','2026-03-15','Scheduled inter-facility transfer'],
    ];
    for (const b of billingData) {
      await client.query(
        `INSERT INTO billing (call_id,pcr_id,patient_name,insurance_type,insurance_provider,policy_number,service_type,mileage,base_charge,mileage_charge,supply_charges,total_charge,amount_paid,amount_due,status,submitted_date,payment_date,notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
        b
      );
    }
    console.log(`Seeded ${billingData.length} billing records.`);

    // ── Seed Incidents ───────────────────────────────────────────────────
    const incidentsData = [
      ['INC-2026-0001',1,'Cardiac Arrest','142 Oak Street, Metro City',33.7551000,-84.3901000,'M1, E1',1,'Major','321','E0113','72yo male cardiac arrest. ROSC achieved after 12 min CPR.','closed'],
      ['INC-2026-0002',2,'Motor Vehicle Collision','I-85 NB at Exit 42, Metro City',33.7625000,-84.3855000,'M2, M3, S1',3,'Moderate','324','E0204','3-vehicle MVC, 1 entrapped. Fire extrication required.','closed'],
      ['INC-2026-0003',3,'Fall - Nursing Facility','89 Pine Valley Dr, Metro City',33.7702000,-84.3752000,'M3',1,'Minor','311','E0902','Elderly fall at nursing home, hip fracture suspected.','closed'],
      ['INC-2026-0004',4,'Chest Pain - STEMI','310 Magnolia Blvd, Metro City',33.7485000,-84.3955000,'M4',1,'Major','311','E0304','STEMI identified in field, cath lab activated.','closed'],
      ['INC-2026-0005',5,'Pediatric Respiratory','27 Cedar Lane, Metro City',33.7535000,-84.4005000,'M5',1,'Moderate','311','E0603','Pediatric asthma exacerbation, required continuous neb.','under_review'],
      ['INC-2026-0006',6,'Stroke','55 Birch Avenue, Metro City',33.7605000,-84.3705000,'B1',1,'Major','311','E0113','Acute CVA, stroke alert activated. Within tPA window.','closed'],
      ['INC-2026-0007',7,'Overdose','412 River St, Metro City',33.7455000,-84.3805000,'B2',1,'Major','311','E0113','Suspected opioid OD, Narcan responsive.','closed'],
      ['INC-2026-0008',8,'Abdominal Emergency','1800 Peachtree Rd, Metro City',33.7585000,-84.4055000,'B3',1,'Minor','311','E0902','Suspected appendicitis, stable transport.','closed'],
      ['INC-2026-0009',9,'Seizure - Pediatric','500 School Rd, Metro City',33.7665000,-84.3655000,'E1',1,'Moderate','311','E0603','New onset seizure in 12yo, status epilepticus managed.','under_review'],
      ['INC-2026-0010',10,'Anaphylaxis','220 Main St, Metro City',33.7725000,-84.3555000,'E2',1,'Major','311','E0113','Severe anaphylaxis, multiple epinephrine doses required.','closed'],
      ['INC-2026-0011',11,'Diabetic Emergency','100 Business Park Dr, Metro City',33.7565000,-84.3875000,'S1',1,'Minor','311','E0902','Hypoglycemia corrected in field, patient AMA.','closed'],
      ['INC-2026-0012',12,'Stabbing','Corner of 5th and Main, Metro City',33.7655000,-84.3785000,'M2, S2',1,'Major','321','E0113','Penetrating chest trauma, rapid transport to trauma center.','under_review'],
      ['INC-2026-0013',13,'Pediatric Fever/Seizure','78 Willow Creek Ct, Metro City',33.7505000,-84.3925000,'M3',1,'Moderate','311','E0603','Febrile seizure in 2yo, post-ictal on arrival.','closed'],
      ['INC-2026-0014',14,'Lift Assist','16 Sunset Terrace, Metro City',33.7435000,-84.3865000,'B4',1,'Minor','553','E0902','Non-injury fall, lift assist only.','closed'],
      ['INC-2026-0015',15,'Chemical Burn','940 Industrial Blvd, Metro City',33.7695000,-84.3605000,'M5, F1',1,'Major','311','E0113','Chemical burn ~15% BSA, decon and transport to burn center.','open'],
    ];
    for (const inc of incidentsData) {
      await client.query(
        `INSERT INTO incidents (incident_number,call_id,incident_type,location_address,lat,lng,units_involved,patients_count,severity,nfirs_code,nemsis_code,narrative,status,date_time)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,CURRENT_TIMESTAMP - interval '1 hour' * (random()*10)::int)`,
        inc
      );
    }
    console.log(`Seeded ${incidentsData.length} incidents.`);

    // ── Seed Performance Metrics ─────────────────────────────────────────
    const perfData = [];
    for (let i = 0; i < 15; i++) {
      const totalCalls = 18 + Math.floor(Math.random() * 15);
      const avgResp = 380 + Math.floor(Math.random() * 180);
      const under8 = Math.floor(totalCalls * (0.6 + Math.random() * 0.2));
      const under12 = Math.floor(totalCalls * (0.85 + Math.random() * 0.1));
      const transports = Math.floor(totalCalls * 0.75);
      const als = Math.floor(totalCalls * 0.55);
      const bls = totalCalls - als;
      const cardiac = Math.floor(Math.random() * 3);
      const rosc = Math.min(cardiac, Math.floor(Math.random() * 2));
      const maGiven = Math.floor(Math.random() * 3);
      const maReceived = Math.floor(Math.random() * 2);
      const utilization = 35 + Math.random() * 30;
      const turnaround = 22 + Math.floor(Math.random() * 15);
      const onTime = 80 + Math.random() * 15;
      const satisfaction = 3.5 + Math.random() * 1.4;
      perfData.push([
        totalCalls, avgResp, under8, under12, transports, als, bls,
        cardiac, rosc, maGiven, maReceived,
        parseFloat(utilization.toFixed(2)),
        turnaround,
        parseFloat(onTime.toFixed(2)),
        parseFloat(satisfaction.toFixed(1))
      ]);
    }
    for (let i = 0; i < perfData.length; i++) {
      const p = perfData[i];
      await client.query(
        `INSERT INTO performance_metrics (metric_date,total_calls,avg_response_time_seconds,calls_under_8_min,calls_under_12_min,total_transports,als_calls,bls_calls,cardiac_arrests,rosc_count,mutual_aid_given,mutual_aid_received,unit_utilization_pct,avg_turnaround_minutes,on_time_response_pct,patient_satisfaction_score)
         VALUES (CURRENT_DATE - interval '${i} days',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        p
      );
    }
    console.log(`Seeded ${perfData.length} performance metrics.`);

    // ── Seed Protocols ───────────────────────────────────────────────────
    const protocolsData = [
      ['P-100','Cardiac Arrest - Adult','Cardiac','Management of adult cardiac arrest (VF/pVT/PEA/Asystole)','1. Confirm arrest 2. Begin CPR 30:2 3. Attach AED/monitor 4. Analyze rhythm 5. Shock if indicated 6. Continue CPR 7. Establish IV/IO 8. Administer medications per rhythm','Epinephrine 1mg IV/IO q3-5min, Amiodarone 300mg IV first dose then 150mg','Active DNR/POLST, obvious signs of death','Consider Lucas device for prolonged resuscitation',true,true],
      ['P-101','STEMI Management','Cardiac','Acute ST-elevation myocardial infarction protocol','1. 12-lead ECG 2. Transmit to receiving facility 3. ASA 324mg 4. NTG 0.4mg SL 5. IV access 6. Pain management 7. Activate cath lab','Aspirin 324mg, Nitroglycerin 0.4mg SL, Morphine 2-4mg IV, Heparin 5000u','NTG: SBP <100, sildenafil use within 24hrs. Morphine: respiratory depression','Right-sided MI - avoid NTG, fluid bolus indicated',false,true],
      ['P-200','Trauma - Multi-System','Trauma','Management of multi-system trauma patient','1. Scene safety 2. C-spine stabilization 3. Primary survey ABCDE 4. Control hemorrhage 5. IV access x2 6. Fluid resuscitation 7. Pain management 8. Rapid transport','Normal Saline/LR, Fentanyl or Morphine for pain, TXA 1g','Minimize scene time <10 min for critical trauma','Consider TXA within 3 hours of injury',true,true],
      ['P-201','Spinal Motion Restriction','Trauma','Spinal immobilization and clearance protocol','1. Assess mechanism 2. Assess neuro status 3. Apply c-collar if indicated 4. Long board if needed 5. Reassess','None','Do not immobilize if patient ambulatory and no risk factors','Use clinical judgment - selective immobilization preferred',true,true],
      ['P-300','Respiratory Distress - Adult','Medical','Management of acute respiratory distress in adults','1. Assess airway 2. Apply O2 3. Obtain vitals/SpO2 4. Auscultate lungs 5. Determine etiology 6. Treat cause-specific 7. Consider CPAP','Albuterol 2.5mg neb, Ipratropium 0.5mg neb, Methylprednisolone 125mg IV','CPAP: pneumothorax, vomiting, inability to protect airway','Consider CPAP early for CHF/COPD exacerbation',true,true],
      ['P-301','Asthma - Pediatric','Pediatric','Pediatric asthma exacerbation management','1. Assess severity 2. Position of comfort 3. O2 to maintain SpO2 >94% 4. Nebulized bronchodilators 5. Consider IM epi for severe','Albuterol 2.5mg neb, Ipratropium 0.25mg neb, Epinephrine 0.01mg/kg IM','IM Epi: only for severe/imminent arrest','Weight-based dosing critical. Use Broselow tape.',true,true],
      ['P-400','Stroke / CVA','Medical','Acute stroke assessment and management','1. FAST assessment 2. Establish time of onset 3. BGL check 4. Neuro exam 5. Large bore IV 6. Stroke alert to receiving 7. Rapid transport','None in field - tPA at receiving facility','Do not lower BP unless >220 systolic','Door to needle goal <60 min. Communicate onset time clearly.',false,true],
      ['P-500','Overdose - Opioid','Medical','Management of suspected opioid overdose','1. Scene safety (fentanyl precautions) 2. Assess responsiveness 3. Open airway 4. BVM if needed 5. Naloxone 6. Monitor for re-sedation','Naloxone 2mg IN or 0.4-2mg IV, may repeat q2-3min','Titrate naloxone to adequate respirations, not full consciousness','Re-sedation common, especially with long-acting opioids',true,true],
      ['P-501','Behavioral Emergency','Medical','Management of acute behavioral/psychiatric emergency','1. Scene safety priority 2. Assess for medical causes 3. De-escalation techniques 4. Chemical sedation if danger 5. Restraints last resort','Midazolam 5mg IM, Ketamine 4mg/kg IM for excited delirium','Monitor airway closely with any sedation','Document restraint checks q5 min. PD should accompany.',true,true],
      ['P-600','Allergic Reaction / Anaphylaxis','Medical','Management of allergic reactions and anaphylaxis','1. Remove allergen 2. Assess severity 3. Epinephrine for anaphylaxis 4. Antihistamines 5. Steroids 6. Fluid resuscitation if hypotensive','Epinephrine 0.3mg IM, Diphenhydramine 50mg IV, Methylprednisolone 125mg IV, NS bolus','May repeat epinephrine q5-15min as needed','Biphasic reaction possible - warn patient at hospital',true,true],
      ['P-700','Diabetic Emergency','Medical','Management of hypo/hyperglycemia','1. Check BGL 2. If <60: oral glucose if conscious 3. D50 25g IV if AMS 4. If >400: IV fluid, assess for DKA 5. Recheck BGL','Oral glucose 15g, Dextrose 50% 25g IV, Glucagon 1mg IM','D50: infiltration risk. Glucagon: may not work in alcoholics/liver disease','Recheck BGL q10 min until >80',true,true],
      ['P-800','Burns','Trauma','Management of thermal and chemical burns','1. Stop burning process 2. Remove clothing/jewelry 3. Assess BSA (Rule of 9s) 4. Cool with room temp water 5. Cover with dry sterile dressing 6. IV fluid resuscitation 7. Pain management','Morphine 0.1mg/kg IV, NS per Parkland formula for >20% BSA','Do not use ice. Do not break blisters.','Chemical burns: continuous irrigation 20+ min. Contact poison control.',true,true],
      ['P-900','Obstetric Emergency','OB','Management of obstetric emergencies including delivery','1. Assess stage of labor 2. Prepare for delivery if imminent 3. Manage complications 4. Newborn care 5. Monitor for hemorrhage','Oxytocin 10u IM post-delivery, Magnesium sulfate for eclampsia','Magnesium: monitor reflexes, resp rate. Calcium gluconate at bedside.','Breech/cord prolapse: Trendelenburg, rapid transport',true,true],
      ['P-1000','Seizure Management','Medical','Management of active seizures and status epilepticus','1. Protect patient from injury 2. Suction PRN 3. O2 4. Check BGL 5. Benzodiazepine for prolonged/repeated seizure 6. Monitor airway','Midazolam 5mg IM or 0.2mg/kg IN, Diazepam 5mg IV','Monitor for respiratory depression post-benzo','Status epilepticus = seizure >5 min or repeated without recovery',true,true],
      ['P-1100','Pain Management','Medical','General pain management protocol','1. Assess pain 0-10 scale 2. Consider cause 3. Non-pharmacologic measures 4. Pharmacologic per level 5. Reassess','Morphine 0.1mg/kg IV, Fentanyl 1mcg/kg IV/IN, Ketorolac 15-30mg IV, Ketamine 0.3mg/kg IV (sub-dissociative)','Morphine/Fentanyl: respiratory depression, hypotension','Use multimodal approach when possible. Document reassessment.',false,true],
    ];
    for (const p of protocolsData) {
      await client.query(
        `INSERT INTO protocols (protocol_number,title,category,description,steps,medications,contraindications,special_considerations,bls_scope,als_scope,last_updated)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,CURRENT_DATE)`,
        p
      );
    }
    console.log(`Seeded ${protocolsData.length} protocols.`);

    // ── Seed Comm Logs ───────────────────────────────────────────────────
    const commData = [
      [1,1,'Dispatch','dispatch','Dispatch','M1','Cardiac arrest reported at 142 Oak St. CPR in progress. Respond priority 1.'],
      [1,9,'Dispatch','dispatch','Dispatch','E1','Cardiac arrest - second unit requested. Respond to 142 Oak St.'],
      [1,1,'Tac-1','status_update','M1','Dispatch','M1 on scene. Confirming cardiac arrest. Beginning resuscitation.'],
      [2,2,'Dispatch','dispatch','Dispatch','M2','MVA I-85 NB Exit 42. Multiple vehicles, possible entrapment. Priority 1.'],
      [2,3,'Dispatch','dispatch','Dispatch','M3','MVA I-85 NB Exit 42. Second ambulance. Respond priority 1.'],
      [3,4,'Dispatch','dispatch','Dispatch','M3','Fall at Pine Valley Nursing, 89 Pine Valley Dr. 84yo female, hip pain.'],
      [4,5,'Tac-2','medical_command','M4','Metro General ED','STEMI alert. 58yo male, 12-lead transmitted. ETA 8 minutes.'],
      [5,7,'Dispatch','dispatch','Dispatch','M5','Pediatric respiratory distress, 27 Cedar Ln. 4yo male. Priority 2.'],
      [6,1,'Dispatch','dispatch','Dispatch','B1','Stroke alert. 55 Birch Ave. 67yo male, FAST positive. Onset 45 min ago.'],
      [7,7,'Tac-1','status_update','B2','Dispatch','B2 on scene. Patient responsive after Narcan. Requesting PD for scene.'],
      [12,2,'Dispatch','dispatch','Dispatch','M2','Stabbing at 5th and Main. PD on scene. Respond priority 1.'],
      [12,12,'Dispatch','dispatch','Dispatch','S2','Supervisor requested at 5th and Main for stabbing incident.'],
      [15,13,'Dispatch','dispatch','Dispatch','F1','Fly car respond to 940 Industrial Blvd. Chemical burn, priority 2.'],
      [15,5,'Tac-3','medical_command','M5','Metro Burn Center','Chemical burn patient, ~15% BSA partial thickness. Decon complete. ETA 12 min.'],
      [16,12,'Dispatch','dispatch','Dispatch','S2','PD requesting EMS standby at 425 Elm St. Psychiatric emergency.'],
    ];
    for (const c of commData) {
      await client.query(
        `INSERT INTO comm_logs (call_id,unit_id,channel,message_type,from_entity,to_entity,message,timestamp)
         VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_TIMESTAMP - interval '1 minute' * (random()*120)::int)`,
        c
      );
    }
    console.log(`Seeded ${commData.length} communication logs.`);

    // ── Seed Exposure Tracking ───────────────────────────────────────────
    const exposureData = [
      [1,1,'Bloodborne','2026-03-20','Unknown','Needle stick during IV access on cardiac arrest patient. Gloves were on but needle penetrated.','Gloves, eye protection',true,'2026-04-03','pending',null,null],
      [7,7,'Bloodborne','2026-03-19','Hepatitis C','Blood splash to face during overdose patient management. Patient known HCV positive.','Gloves, gown',true,'2026-04-02','in_progress','Baseline labs drawn',null],
      [3,3,'Airborne','2026-03-15','Tuberculosis','Patient at nursing facility later confirmed active TB. Crew was in room for 25 minutes.','Surgical mask only',true,'2026-03-29','in_progress','TST placed, awaiting read','Recommend N95 fit test refresher'],
      [9,9,'Bloodborne','2026-03-18','Unknown','Blood exposure during pediatric seizure management. Patient bit tongue, blood on uniform.','Gloves',true,'2026-04-01','pending',null,null],
      [2,12,'Contact','2026-03-17','MRSA','Patient with known MRSA wound. Contact during wound assessment.','Gloves, gown',false,null,'completed','No infection','Standard decon completed'],
      [5,5,'Airborne','2026-03-16','COVID-19','Pediatric patient later tested positive for COVID-19. Close contact during nebulizer treatment.','N95, gloves, eye protection',true,'2026-03-30','pending',null,'Crew member vaccinated and boosted'],
      [10,10,'Chemical','2026-03-14','Fentanyl','Powder exposure at overdose scene. Skin contact on forearm despite gloves.','Gloves, N95',true,'2026-03-28','completed','Cleared - no symptoms','Decon protocol followed on scene'],
      [6,6,'Bloodborne','2026-03-13','Unknown','Blood splash during stroke patient IV access. Blood on ungloved hand (glove torn).','Torn gloves',true,'2026-03-27','in_progress','Baseline labs drawn',null],
      [15,15,'Chemical','2026-03-20','Industrial chemicals','Secondary chemical exposure while treating burn patient at auto body shop.','Gloves, gown, SCBA by fire',true,'2026-04-03','pending',null,'Poison control contacted'],
      [4,4,'Airborne','2026-03-12','Influenza A','Patient confirmed influenza A after transport. Extended contact in ambulance.','Surgical mask, gloves',false,null,'completed','No illness developed','Crew had flu vaccination'],
      [16,16,'Contact','2026-03-11','Scabies','Patient at psychiatric emergency had undiagnosed scabies. Extended skin contact.','Gloves only',true,'2026-03-25','completed','Prophylactic treatment given','All linens and uniforms treated'],
      [12,12,'Bloodborne','2026-03-10','HIV','Stab wound patient - significant blood exposure during treatment. Patient HIV status unknown.','Gloves, gown, eye protection',true,'2026-03-24','in_progress','PEP started within 2 hours','Follow up at 6 weeks, 3 months, 6 months'],
      [11,11,'Airborne','2026-03-09','Unknown respiratory','Patient with severe pneumonia of unknown etiology. Crew in enclosed space.','N95, gloves',true,'2026-03-23','pending',null,'Awaiting patient culture results'],
      [8,8,'Contact','2026-03-08','Unknown rash','Patient with undiagnosed vesicular rash. Possible varicella.','Gloves',true,'2026-03-22','completed','Crew member immune (prior varicella)','Verified immunity via titer'],
      [14,14,'Bloodborne','2026-03-07','Hepatitis B','Blood exposure from patient with chronic HBV during lift assist (skin tear on patient).','Gloves',false,null,'completed','Crew member HBV vaccinated - immune','Titer confirmed immunity'],
    ];
    for (const e of exposureData) {
      await client.query(
        `INSERT INTO exposure_tracking (crew_id,call_id,exposure_type,exposure_date,pathogen,description,ppe_worn,follow_up_required,follow_up_date,follow_up_status,result,notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        e
      );
    }
    console.log(`Seeded ${exposureData.length} exposure records.`);

    // ── Seed QA Reviews ──────────────────────────────────────────────────
    const qaData = [
      [1,1,'Dr. Alan Marsh','2026-03-21','Clinical',92,'Excellent adherence to cardiac arrest protocol. Timely defibrillation and medication administration.','Document exact times of each medication dose more precisely.',false,null,'completed'],
      [2,2,'Thomas Grant','2026-03-21','Documentation',78,'PCR narrative thorough but missing secondary survey documentation.','Complete secondary survey findings in narrative section.',true,'Added secondary survey template reminder','completed'],
      [3,3,'Dr. Alan Marsh','2026-03-20','Clinical',88,'Appropriate pain management and splinting. Good nursing facility communication.','Consider earlier pain reassessment documentation.',false,null,'completed'],
      [4,4,'Thomas Grant','2026-03-22','Protocol Compliance',95,'STEMI protocol followed perfectly. 12-lead transmitted, cath lab activated en route.','No recommendations - exemplary call.',false,null,'completed'],
      [5,5,'Dr. Alan Marsh','2026-03-20','Clinical',90,'Good pediatric assessment. Appropriate escalation of bronchodilator therapy.','Consider documenting weight-based dose calculations.',false,null,'completed'],
      [6,6,'Thomas Grant','2026-03-22','Response Time',85,'Response time 6:42 - within standard. However, stroke alert called at 8 min.','Stroke alert should be called immediately upon FAST positive assessment.',true,'Will review stroke alert timing in training','follow_up'],
      [7,7,'Dr. Alan Marsh','2026-03-21','Clinical',82,'Appropriate naloxone administration. Patient monitored for re-sedation.','Document pupil size and respiratory rate before and after naloxone.',true,null,'pending'],
      [8,8,'Thomas Grant','2026-03-22','Documentation',91,'Well-documented assessment and transport decision. Good differential consideration.','None - good documentation.',false,null,'completed'],
      [9,9,'Dr. Alan Marsh','2026-03-22','Clinical',87,'Status epilepticus managed well. Midazolam given at appropriate time.','Document seizure characteristics more specifically (tonic-clonic vs focal).',false,null,'completed'],
      [10,10,'Thomas Grant','2026-03-22','Protocol Compliance',93,'Anaphylaxis protocol followed. Multiple epi doses documented with times.','Excellent call management.',false,null,'completed'],
      [12,12,'Dr. Alan Marsh','2026-03-22','Clinical',89,'Rapid assessment and transport for penetrating trauma. Scene time <8 min.','Consider documenting bilateral breath sounds after chest seal application.',true,null,'in_review'],
      [13,13,'Thomas Grant','2026-03-20','Response Time',72,'Response time 9:15 - slightly above 8-minute target for priority 2 call.','Review unit positioning during this time period for optimization.',true,'Unit was returning from prior call - unavoidable','completed'],
      [14,14,'Dr. Alan Marsh','2026-03-19','Documentation',94,'Thorough documentation for refusal. Risks explained and documented.','No recommendations.',false,null,'completed'],
      [15,15,'Thomas Grant','2026-03-22','Clinical',86,'Good decontamination and wound management. Appropriate destination selection.','Document exact chemical agent if known for receiving facility.',true,null,'pending'],
      [16,null,'Dr. Alan Marsh','2026-03-22','Documentation',80,'Psychiatric call documentation adequate but could include more behavioral observations.','Add structured behavioral assessment section to psych call PCRs.',true,'Developing new psych assessment form','follow_up'],
    ];
    for (const q of qaData) {
      await client.query(
        `INSERT INTO qa_reviews (call_id,pcr_id,reviewer_name,review_date,category,score,findings,recommendations,action_required,action_taken,status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        q
      );
    }
    console.log(`Seeded ${qaData.length} QA reviews.`);

    // ── Seed Mutual Aid ──────────────────────────────────────────────────
    const mutualAidData = [
      ['given','Westfield Fire/EMS',2,'M3',null,null,'Multi-vehicle MVC requiring additional units beyond Metro County capacity.','completed'],
      ['received','Northside Fire Department',2,'Engine 44',null,null,'Requested engine company for extrication at MVA scene.','completed'],
      ['given','Lakewood EMS',null,'B1',null,null,'Covered Lakewood district during their multi-alarm fire.','completed'],
      ['received','State Police Medevac',4,'Trooper 3 (Helicopter)',null,null,'Requested helicopter for critical STEMI patient - long transport.','completed'],
      ['given','Greenfield Township EMS',null,'M4',null,null,'Provided ALS intercept for BLS agency on cardiac call.','completed'],
      ['received','County Fire Authority',12,'Rescue 7',null,null,'Heavy rescue requested for barricaded psychiatric patient.','completed'],
      ['given','Riverside Fire/EMS',null,'M5',null,null,'Covered Riverside district during their station move.','completed'],
      ['received','Westfield Fire/EMS',15,'Hazmat 1',null,null,'Hazmat team requested for chemical burn incident at auto body shop.','active'],
      ['given','Southside EMS',null,'B2',null,null,'BLS transport assist during Southside unit shortage.','completed'],
      ['received','University Hospital EMS',9,'Critical Care Transport',null,null,'CCT requested for pediatric status epilepticus patient.','completed'],
      ['given','Eastside Fire/EMS',null,'M1',null,null,'ALS response to Eastside district - their unit out of service.','completed'],
      ['received','Northside Fire Department',1,'Engine 41',null,null,'First responder engine requested for CPR in progress.','completed'],
      ['given','County Sheriff SAR',null,'B3',null,null,'EMS standby for county search and rescue operation.','completed'],
      ['received','Regional Poison Control',15,null,null,null,'Consulted on chemical exposure agent identification and treatment.','active'],
      ['given','Metro Airport Authority',null,'M2',null,null,'Provided mutual aid for medical emergency at regional airport.','completed'],
    ];
    for (const m of mutualAidData) {
      await client.query(
        `INSERT INTO mutual_aid (request_type,agency_name,call_id,unit_sent,arrival_time,clear_time,reason,status,request_time)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,CURRENT_TIMESTAMP - interval '1 hour' * (random()*24)::int)`,
        m
      );
    }
    console.log(`Seeded ${mutualAidData.length} mutual aid records.`);

    // ── Summary ──────────────────────────────────────────────────────────
    console.log('\n--- Seed Summary ---');
    const tables = [
      'users','units','calls','crew','schedules','hospitals',
      'patient_care_reports','equipment','medications','vehicle_maintenance',
      'certifications','billing','incidents','performance_metrics',
      'protocols','comm_logs','exposure_tracking','qa_reviews','mutual_aid'
    ];
    for (const t of tables) {
      const res = await client.query(`SELECT COUNT(*) FROM ${t}`);
      console.log(`  ${t}: ${res.rows[0].count} rows`);
    }
    console.log('\nDatabase seeded successfully!');

  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
