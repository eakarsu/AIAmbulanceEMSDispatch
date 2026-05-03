-- EMS Dispatch Platform Database Schema

-- Users / Authentication
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'dispatcher',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Units (Ambulances/Vehicles)
CREATE TABLE IF NOT EXISTS units (
  id SERIAL PRIMARY KEY,
  unit_number VARCHAR(50) UNIQUE NOT NULL,
  unit_type VARCHAR(50) NOT NULL, -- BLS, ALS, Supervisor, Fly Car
  status VARCHAR(50) DEFAULT 'available', -- available, en_route, on_scene, at_hospital, out_of_service
  current_lat DECIMAL(10,7),
  current_lng DECIMAL(10,7),
  station VARCHAR(100),
  crew_lead VARCHAR(255),
  capability_level VARCHAR(50), -- BLS, ALS, Critical Care
  last_status_change TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Calls / Incidents
CREATE TABLE IF NOT EXISTS calls (
  id SERIAL PRIMARY KEY,
  call_number VARCHAR(50) UNIQUE NOT NULL,
  call_type VARCHAR(100) NOT NULL,
  priority INTEGER DEFAULT 3, -- 1=Critical, 2=Emergent, 3=Urgent, 4=Non-urgent
  status VARCHAR(50) DEFAULT 'pending', -- pending, dispatched, en_route, on_scene, transporting, completed, cancelled
  caller_name VARCHAR(255),
  caller_phone VARCHAR(50),
  patient_name VARCHAR(255),
  patient_age INTEGER,
  patient_gender VARCHAR(20),
  location_address TEXT,
  location_lat DECIMAL(10,7),
  location_lng DECIMAL(10,7),
  chief_complaint TEXT,
  description TEXT,
  assigned_unit_id INTEGER REFERENCES units(id),
  dispatch_time TIMESTAMP,
  en_route_time TIMESTAMP,
  on_scene_time TIMESTAMP,
  transport_time TIMESTAMP,
  hospital_arrival_time TIMESTAMP,
  clear_time TIMESTAMP,
  response_time_seconds INTEGER,
  destination_hospital VARCHAR(255),
  ai_triage_score INTEGER,
  ai_triage_reasoning TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Crew Members
CREATE TABLE IF NOT EXISTS crew (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(50) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL, -- EMT-B, EMT-A, Paramedic, Driver
  certification_level VARCHAR(50),
  certification_expiry DATE,
  phone VARCHAR(50),
  email VARCHAR(255),
  hire_date DATE,
  assigned_unit_id INTEGER REFERENCES units(id),
  status VARCHAR(50) DEFAULT 'active', -- active, on_leave, inactive
  hours_this_week DECIMAL(5,2) DEFAULT 0,
  consecutive_hours DECIMAL(5,2) DEFAULT 0,
  fatigue_risk_level VARCHAR(20) DEFAULT 'low', -- low, moderate, high, critical
  created_at TIMESTAMP DEFAULT NOW()
);

-- Crew Scheduling
CREATE TABLE IF NOT EXISTS schedules (
  id SERIAL PRIMARY KEY,
  crew_id INTEGER REFERENCES crew(id) ON DELETE CASCADE,
  shift_type VARCHAR(20) NOT NULL, -- 12hr, 24hr, 48hr
  shift_start TIMESTAMP NOT NULL,
  shift_end TIMESTAMP NOT NULL,
  assigned_unit_id INTEGER REFERENCES units(id),
  status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, active, completed, called_off
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Patient Care Reports (PCR)
CREATE TABLE IF NOT EXISTS patient_care_reports (
  id SERIAL PRIMARY KEY,
  pcr_number VARCHAR(50) UNIQUE NOT NULL,
  call_id INTEGER REFERENCES calls(id),
  patient_name VARCHAR(255) NOT NULL,
  patient_dob DATE,
  patient_age INTEGER,
  patient_gender VARCHAR(20),
  patient_weight DECIMAL(5,1),
  allergies TEXT,
  medications TEXT,
  medical_history TEXT,
  chief_complaint TEXT,
  narrative TEXT,
  vitals_bp VARCHAR(20),
  vitals_hr INTEGER,
  vitals_rr INTEGER,
  vitals_spo2 INTEGER,
  vitals_temp DECIMAL(4,1),
  vitals_gcs INTEGER,
  treatments_given TEXT,
  procedures TEXT,
  medications_administered TEXT,
  transport_disposition VARCHAR(100),
  receiving_facility VARCHAR(255),
  receiving_physician VARCHAR(255),
  crew_lead VARCHAR(255),
  crew_members TEXT,
  ai_draft TEXT,
  status VARCHAR(50) DEFAULT 'draft', -- draft, completed, reviewed, locked
  created_at TIMESTAMP DEFAULT NOW()
);

-- Hospitals
CREATE TABLE IF NOT EXISTS hospitals (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  phone VARCHAR(50),
  er_status VARCHAR(50) DEFAULT 'open', -- open, diversion, closed
  trauma_level VARCHAR(20), -- Level I, II, III, IV, None
  stroke_center BOOLEAN DEFAULT FALSE,
  cardiac_center BOOLEAN DEFAULT FALSE,
  burn_center BOOLEAN DEFAULT FALSE,
  pediatric_center BOOLEAN DEFAULT FALSE,
  available_beds INTEGER DEFAULT 0,
  er_wait_minutes INTEGER DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Equipment Inventory
CREATE TABLE IF NOT EXISTS equipment (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100), -- Medical, Communication, Safety, Vehicle
  unit_id INTEGER REFERENCES units(id),
  serial_number VARCHAR(100),
  status VARCHAR(50) DEFAULT 'operational', -- operational, needs_repair, out_of_service, expired
  last_inspected DATE,
  next_inspection_due DATE,
  quantity INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Medication Tracking
CREATE TABLE IF NOT EXISTS medications (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  drug_class VARCHAR(100),
  schedule VARCHAR(20), -- Schedule II, III, IV, V, OTC
  unit_id INTEGER REFERENCES units(id),
  quantity DECIMAL(10,2),
  unit_measure VARCHAR(50), -- mg, ml, units, tablets
  lot_number VARCHAR(100),
  expiration_date DATE,
  controlled_substance BOOLEAN DEFAULT FALSE,
  last_count_date DATE,
  last_count_by VARCHAR(255),
  status VARCHAR(50) DEFAULT 'in_stock', -- in_stock, low, expired, recalled
  created_at TIMESTAMP DEFAULT NOW()
);

-- Vehicle Maintenance
CREATE TABLE IF NOT EXISTS vehicle_maintenance (
  id SERIAL PRIMARY KEY,
  unit_id INTEGER REFERENCES units(id),
  maintenance_type VARCHAR(100), -- Oil Change, Tire Rotation, Brake Service, Annual Inspection
  description TEXT,
  scheduled_date DATE,
  completed_date DATE,
  mileage INTEGER,
  cost DECIMAL(10,2),
  vendor VARCHAR(255),
  status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, in_progress, completed, overdue
  next_due_date DATE,
  next_due_mileage INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Certifications
CREATE TABLE IF NOT EXISTS certifications (
  id SERIAL PRIMARY KEY,
  crew_id INTEGER REFERENCES crew(id) ON DELETE CASCADE,
  certification_type VARCHAR(100) NOT NULL, -- EMT-B, Paramedic, ACLS, PALS, PHTLS, CPR, Driver
  certification_number VARCHAR(100),
  issuing_authority VARCHAR(255),
  issue_date DATE,
  expiry_date DATE,
  status VARCHAR(50) DEFAULT 'active', -- active, expired, pending_renewal, suspended
  ce_hours_completed DECIMAL(5,1) DEFAULT 0,
  ce_hours_required DECIMAL(5,1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Billing
CREATE TABLE IF NOT EXISTS billing (
  id SERIAL PRIMARY KEY,
  call_id INTEGER REFERENCES calls(id),
  pcr_id INTEGER REFERENCES patient_care_reports(id),
  patient_name VARCHAR(255),
  insurance_type VARCHAR(50), -- Medicare, Medicaid, Private, Self-Pay, Workers Comp
  insurance_provider VARCHAR(255),
  policy_number VARCHAR(100),
  service_type VARCHAR(100), -- BLS Emergency, ALS Emergency, BLS Non-Emergency, ALS Non-Emergency, SCT
  mileage DECIMAL(6,1),
  base_charge DECIMAL(10,2),
  mileage_charge DECIMAL(10,2),
  supply_charges DECIMAL(10,2),
  total_charge DECIMAL(10,2),
  amount_paid DECIMAL(10,2) DEFAULT 0,
  amount_due DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'pending', -- pending, submitted, approved, denied, paid, collections
  submitted_date DATE,
  payment_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Incidents / Mapping
CREATE TABLE IF NOT EXISTS incidents (
  id SERIAL PRIMARY KEY,
  incident_number VARCHAR(50) UNIQUE NOT NULL,
  call_id INTEGER REFERENCES calls(id),
  incident_type VARCHAR(100),
  location_address TEXT,
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  date_time TIMESTAMP,
  units_involved TEXT,
  patients_count INTEGER DEFAULT 1,
  severity VARCHAR(50), -- Minor, Moderate, Major, Mass Casualty
  nfirs_code VARCHAR(20),
  nemsis_code VARCHAR(20),
  narrative TEXT,
  status VARCHAR(50) DEFAULT 'open', -- open, under_review, closed
  created_at TIMESTAMP DEFAULT NOW()
);

-- Performance Metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
  id SERIAL PRIMARY KEY,
  metric_date DATE NOT NULL,
  total_calls INTEGER DEFAULT 0,
  avg_response_time_seconds INTEGER,
  calls_under_8_min INTEGER DEFAULT 0,
  calls_under_12_min INTEGER DEFAULT 0,
  total_transports INTEGER DEFAULT 0,
  als_calls INTEGER DEFAULT 0,
  bls_calls INTEGER DEFAULT 0,
  cardiac_arrests INTEGER DEFAULT 0,
  rosc_count INTEGER DEFAULT 0,
  mutual_aid_given INTEGER DEFAULT 0,
  mutual_aid_received INTEGER DEFAULT 0,
  unit_utilization_pct DECIMAL(5,2),
  avg_turnaround_minutes INTEGER,
  on_time_response_pct DECIMAL(5,2),
  patient_satisfaction_score DECIMAL(3,1),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Protocols
CREATE TABLE IF NOT EXISTS protocols (
  id SERIAL PRIMARY KEY,
  protocol_number VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100), -- Cardiac, Trauma, Medical, Pediatric, OB, Behavioral
  description TEXT,
  steps TEXT,
  medications TEXT,
  contraindications TEXT,
  special_considerations TEXT,
  bls_scope BOOLEAN DEFAULT TRUE,
  als_scope BOOLEAN DEFAULT TRUE,
  last_updated DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Communication Logs
CREATE TABLE IF NOT EXISTS comm_logs (
  id SERIAL PRIMARY KEY,
  call_id INTEGER REFERENCES calls(id),
  unit_id INTEGER REFERENCES units(id),
  channel VARCHAR(50),
  message_type VARCHAR(50), -- dispatch, status_update, medical_command, mutual_aid
  from_entity VARCHAR(255),
  to_entity VARCHAR(255),
  message TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Infection Control / Exposure Tracking
CREATE TABLE IF NOT EXISTS exposure_tracking (
  id SERIAL PRIMARY KEY,
  crew_id INTEGER REFERENCES crew(id),
  call_id INTEGER REFERENCES calls(id),
  exposure_type VARCHAR(100), -- Bloodborne, Airborne, Contact, Chemical
  exposure_date DATE,
  pathogen VARCHAR(255),
  description TEXT,
  ppe_worn TEXT,
  follow_up_required BOOLEAN DEFAULT TRUE,
  follow_up_date DATE,
  follow_up_status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, cleared
  result VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Quality Assurance Reviews
CREATE TABLE IF NOT EXISTS qa_reviews (
  id SERIAL PRIMARY KEY,
  call_id INTEGER REFERENCES calls(id),
  pcr_id INTEGER REFERENCES patient_care_reports(id),
  reviewer_name VARCHAR(255),
  review_date DATE,
  category VARCHAR(100), -- Clinical, Documentation, Response Time, Protocol Compliance
  score INTEGER, -- 1-100
  findings TEXT,
  recommendations TEXT,
  action_required BOOLEAN DEFAULT FALSE,
  action_taken TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_review, completed, follow_up
  created_at TIMESTAMP DEFAULT NOW()
);

-- AI Predictions
CREATE TABLE IF NOT EXISTS predictions (
  id SERIAL PRIMARY KEY,
  location_zone VARCHAR(255),
  hours_ahead INTEGER,
  input_data JSONB,
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HIPAA Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  action VARCHAR(100) NOT NULL,
  entity_id INTEGER,
  entity_type VARCHAR(100),
  ip_address VARCHAR(45),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mutual Aid Requests
CREATE TABLE IF NOT EXISTS mutual_aid (
  id SERIAL PRIMARY KEY,
  request_type VARCHAR(50), -- given, received
  agency_name VARCHAR(255),
  call_id INTEGER REFERENCES calls(id),
  unit_sent VARCHAR(100),
  request_time TIMESTAMP,
  arrival_time TIMESTAMP,
  clear_time TIMESTAMP,
  reason TEXT,
  status VARCHAR(50) DEFAULT 'active', -- active, completed, cancelled
  created_at TIMESTAMP DEFAULT NOW()
);

-- Mutual Aid Agency Directory
CREATE TABLE IF NOT EXISTS mutual_aid_agencies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  agency_type VARCHAR(100),
  contact_name VARCHAR(255),
  contact_phone VARCHAR(50),
  contact_email VARCHAR(255),
  radio_frequency VARCHAR(50),
  coverage_area TEXT,
  capabilities TEXT,
  agreement_type VARCHAR(100),
  agreement_expiry DATE,
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI Analysis Results (history)
CREATE TABLE IF NOT EXISTS ai_results (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  analysis_type VARCHAR(100) NOT NULL,
  input_data JSONB,
  result JSONB,
  model VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
