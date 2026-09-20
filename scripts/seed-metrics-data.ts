import "dotenv/config";
import { queryCloudflareD1 } from "../server/_core/d1Client";

async function seedMetricsData() {
  console.log("=== Seeding Initial Historical Data for Waypoint Metrics (PG-042) ===");

  // Check if events already exist
  const existingEvents = await queryCloudflareD1(`SELECT COUNT(*) as count FROM crm_lifecycle_events`);
  const count = existingEvents[0]?.count || 0;
  if (count > 10) {
    console.log(`Already have ${count} lifecycle events seeded. Skipping.`);
    return;
  }

  // Fetch some real contacts and users if available
  const contactsRes = await queryCloudflareD1(`SELECT id, firstName, lastName, jobTitle, state, countyDistrict, planTier, ownerId FROM contacts LIMIT 30`);
  const usersRes = await queryCloudflareD1(`SELECT id, name FROM users LIMIT 10`);

  const students = contactsRes.filter((c: any) => c.jobTitle === "Student" || !c.parentContactId);
  const primaryAdvocateId = usersRes[0]?.id || 1;
  const secondaryAdvocateId = usersRes[1]?.id || 2;

  console.log(`Found ${students.length} students to attach metrics and history.`);

  // 1. Seed CRM Lifecycle Events (Lead Funnel History)
  console.log("Seeding CRM Lifecycle Events (7-stage lead journey)...");
  const referralSources = ["Website Organic", "Master IEP Coach Referral", "Pediatrician", "Parent Support Group", "Social Media", "School Referral", "Past Client Word of Mouth"];
  const nonConversionReasons = [
    "Price",
    "Attorney needed",
    "Outside Waypoint's scope",
    "Not ready",
    "Chose another provider",
    "Unable to reach",
    "No longer needs assistance",
    "Other"
  ];
  const states = ["GA", "FL", "NC", "SC", "TN", "TX", "VA", "MD", "OH", "CA"];
  const districts = ["Gwinnett County Public Schools", "Fulton County Schools", "Cobb County School District", "Dekalb County Schools", "Atlanta Public Schools", "Wake County Public Schools", "Orange County Public Schools"];
  const caseTypes = ["Initial IEP Eligibility", "Annual IEP Review & Goals", "504 Plan Accommodation", "BIP / Behavior Escalation", "Speech & OT Service Reduction Dispute", "Out-of-District Placement", "State Due Process / Complaint"];

  // 7-stage sequence:
  // Stage 1: New Lead (100 total)
  // Stage 2: Discovery Scheduled (82 reach here)
  // Stage 3: Discovery Completed (74 reach here)
  // Stage 4: Agreement Signed (61 reach here)
  // Stage 5: Paid (56 reach here)
  // Stage 6: Onboarding Complete (51 reach here)
  // Stage 7: Advocacy Started (48 reach here)
  
  const now = Date.now();
  const DAY_MS = 86400000;

  for (let i = 1; i <= 95; i++) {
    const leadId = 1000 + i;
    const refSource = referralSources[i % referralSources.length];
    const leadState = states[i % states.length];
    const leadDistrict = districts[i % districts.length];
    const caseType = caseTypes[i % caseTypes.length];
    const advocateId = i % 2 === 0 ? primaryAdvocateId : secondaryAdvocateId;

    const baseMeta = JSON.stringify({
      referralSource: refSource,
      state: leadState,
      district: leadDistrict,
      caseType: caseType,
      advocateId: advocateId,
    });

    const leadCreatedTime = new Date(now - (90 - (i % 80)) * DAY_MS).toISOString();

    // Stage 1: New Lead
    await queryCloudflareD1(`
      INSERT INTO crm_lifecycle_events (tenant_id, entity_type, entity_id, event_type, from_stage, to_stage, stage_duration_seconds, performed_by, metadata, created_at)
      VALUES ('waypoint', 'lead', ${leadId}, 'stage_transition', NULL, 'New Lead', 0, ${advocateId}, '${baseMeta.replace(/'/g, "''")}', '${leadCreatedTime}')
    `);

    // Drops before Discovery Scheduled
    if (i > 80) {
      const dropReason = nonConversionReasons[i % nonConversionReasons.length];
      const dropTime = new Date(new Date(leadCreatedTime).getTime() + 2 * DAY_MS).toISOString();
      await queryCloudflareD1(`
        INSERT INTO crm_lifecycle_events (tenant_id, entity_type, entity_id, event_type, from_stage, to_stage, stage_duration_seconds, reason, performed_by, metadata, created_at)
        VALUES ('waypoint', 'lead', ${leadId}, 'non_conversion', 'New Lead', 'Lost', 172800, '${dropReason}', ${advocateId}, '${baseMeta.replace(/'/g, "''")}', '${dropTime}')
      `);
      continue;
    }

    // Stage 2: Discovery Scheduled (avg 2.4 days later)
    const discSchedTime = new Date(new Date(leadCreatedTime).getTime() + 2.4 * DAY_MS).toISOString();
    await queryCloudflareD1(`
      INSERT INTO crm_lifecycle_events (tenant_id, entity_type, entity_id, event_type, from_stage, to_stage, stage_duration_seconds, performed_by, metadata, created_at)
      VALUES ('waypoint', 'lead', ${leadId}, 'stage_transition', 'New Lead', 'Discovery Scheduled', 207360, ${advocateId}, '${baseMeta.replace(/'/g, "''")}', '${discSchedTime}')
    `);

    if (i > 72) {
      const dropReason = nonConversionReasons[(i + 1) % nonConversionReasons.length];
      const dropTime = new Date(new Date(discSchedTime).getTime() + 3 * DAY_MS).toISOString();
      await queryCloudflareD1(`
        INSERT INTO crm_lifecycle_events (tenant_id, entity_type, entity_id, event_type, from_stage, to_stage, stage_duration_seconds, reason, performed_by, metadata, created_at)
        VALUES ('waypoint', 'lead', ${leadId}, 'non_conversion', 'Discovery Scheduled', 'Lost', 259200, '${dropReason}', ${advocateId}, '${baseMeta.replace(/'/g, "''")}', '${dropTime}')
      `);
      continue;
    }

    // Stage 3: Discovery Completed (avg 3.1 days later)
    const discCompTime = new Date(new Date(discSchedTime).getTime() + 3.1 * DAY_MS).toISOString();
    await queryCloudflareD1(`
      INSERT INTO crm_lifecycle_events (tenant_id, entity_type, entity_id, event_type, from_stage, to_stage, stage_duration_seconds, performed_by, metadata, created_at)
      VALUES ('waypoint', 'lead', ${leadId}, 'stage_transition', 'Discovery Scheduled', 'Discovery Completed', 267840, ${advocateId}, '${baseMeta.replace(/'/g, "''")}', '${discCompTime}')
    `);

    if (i > 60) {
      const dropReason = nonConversionReasons[(i + 2) % nonConversionReasons.length];
      const dropTime = new Date(new Date(discCompTime).getTime() + 4 * DAY_MS).toISOString();
      await queryCloudflareD1(`
        INSERT INTO crm_lifecycle_events (tenant_id, entity_type, entity_id, event_type, from_stage, to_stage, stage_duration_seconds, reason, performed_by, metadata, created_at)
        VALUES ('waypoint', 'lead', ${leadId}, 'non_conversion', 'Discovery Completed', 'Lost', 345600, '${dropReason}', ${advocateId}, '${baseMeta.replace(/'/g, "''")}', '${dropTime}')
      `);
      continue;
    }

    // Stage 4: Agreement Signed (avg 2.8 days later)
    const agrSignedTime = new Date(new Date(discCompTime).getTime() + 2.8 * DAY_MS).toISOString();
    await queryCloudflareD1(`
      INSERT INTO crm_lifecycle_events (tenant_id, entity_type, entity_id, event_type, from_stage, to_stage, stage_duration_seconds, performed_by, metadata, created_at)
      VALUES ('waypoint', 'lead', ${leadId}, 'stage_transition', 'Discovery Completed', 'Agreement Signed', 241920, ${advocateId}, '${baseMeta.replace(/'/g, "''")}', '${agrSignedTime}')
    `);

    if (i > 54) {
      const dropReason = "Price";
      const dropTime = new Date(new Date(agrSignedTime).getTime() + 2 * DAY_MS).toISOString();
      await queryCloudflareD1(`
        INSERT INTO crm_lifecycle_events (tenant_id, entity_type, entity_id, event_type, from_stage, to_stage, stage_duration_seconds, reason, performed_by, metadata, created_at)
        VALUES ('waypoint', 'lead', ${leadId}, 'non_conversion', 'Agreement Signed', 'Lost', 172800, '${dropReason}', ${advocateId}, '${baseMeta.replace(/'/g, "''")}', '${dropTime}')
      `);
      continue;
    }

    // Stage 5: Paid (avg 1.2 days later)
    const paidPlan = i % 5 === 0 ? "$105" : i % 7 === 0 ? "Scholarship" : "$55";
    const paidAmount = paidPlan === "$105" ? 105.0 : paidPlan === "Scholarship" ? 0.0 : 55.0;
    const paidTime = new Date(new Date(agrSignedTime).getTime() + 1.2 * DAY_MS).toISOString();
    await queryCloudflareD1(`
      INSERT INTO crm_lifecycle_events (tenant_id, entity_type, entity_id, event_type, from_stage, to_stage, stage_duration_seconds, performed_by, metadata, created_at)
      VALUES ('waypoint', 'lead', ${leadId}, 'stage_transition', 'Agreement Signed', 'Paid', 103680, ${advocateId}, '${JSON.stringify({ ...JSON.parse(baseMeta), plan: paidPlan, amount: paidAmount }).replace(/'/g, "''")}', '${paidTime}')
    `);

    // Stage 6: Onboarding Complete (avg 3.5 days later)
    if (i <= 48) {
      const onbCompleteTime = new Date(new Date(paidTime).getTime() + 3.5 * DAY_MS).toISOString();
      await queryCloudflareD1(`
        INSERT INTO crm_lifecycle_events (tenant_id, entity_type, entity_id, event_type, from_stage, to_stage, stage_duration_seconds, performed_by, metadata, created_at)
        VALUES ('waypoint', 'lead', ${leadId}, 'stage_transition', 'Paid', 'Onboarding Complete', 302400, ${advocateId}, '${baseMeta.replace(/'/g, "''")}', '${onbCompleteTime}')
      `);

      // Stage 7: Advocacy Started (avg 1.8 days later)
      if (i <= 45) {
        const advStartTime = new Date(new Date(onbCompleteTime).getTime() + 1.8 * DAY_MS).toISOString();
        await queryCloudflareD1(`
          INSERT INTO crm_lifecycle_events (tenant_id, entity_type, entity_id, event_type, from_stage, to_stage, stage_duration_seconds, performed_by, metadata, created_at)
          VALUES ('waypoint', 'lead', ${leadId}, 'stage_transition', 'Onboarding Complete', 'Advocacy Started', 155520, ${advocateId}, '${baseMeta.replace(/'/g, "''")}', '${advStartTime}')
        `);
      }
    }
  }

  // 2. Seed Advocate Time Entries (12 work types)
  console.log("Seeding Advocate Time Entries (Where Our Time Goes)...");
  const workTypes = [
    "Meeting preparation",
    "IEP/504 meeting",
    "Records review",
    "Calls",
    "SMS/messages",
    "Email review",
    "Email drafting",
    "Complaint work",
    "Research",
    "Case strategy",
    "Follow-up",
    "Administrative work"
  ];

  const durations = [25, 45, 60, 90, 120, 30, 40, 75, 15, 50, 110, 35];

  for (let d = 0; d < 30; d++) {
    const entryDate = new Date(now - d * DAY_MS).toISOString().split("T")[0];
    for (let t = 0; t < 6; t++) {
      const workType = workTypes[(d + t) % workTypes.length];
      const duration = durations[(d * 2 + t) % durations.length];
      const advocateId = (d + t) % 2 === 0 ? primaryAdvocateId : secondaryAdvocateId;
      const studentId = students.length > 0 ? students[(d + t) % students.length].id : 1;
      const planTier = (d + t) % 4 === 0 ? "$105" : (d + t) % 6 === 0 ? "Scholarship" : "$55";

      await queryCloudflareD1(`
        INSERT INTO advocate_time_entries (
          tenant_id, user_id, family_contact_id, student_contact_id, work_type,
          entry_date, duration_minutes, plan_tier_at_time, notes, is_auto_generated, created_at
        ) VALUES (
          'waypoint', ${advocateId}, ${studentId}, ${studentId}, '${workType}',
          '${entryDate}', ${duration}, '${planTier}', 'Advocate work logged for case review and preparation', 0, '${entryDate} 14:00:00'
        )
      `);
    }
  }

  // 3. Seed Advocacy Outcomes
  console.log("Seeding Advocacy Outcomes...");
  const outcomeTypes = [
    "accommodations_added",
    "services_increased",
    "evaluations_approved",
    "iep_504_created",
    "iep_504_corrected",
    "placement_change",
    "transportation_resolution",
    "discipline_resolution",
    "state_complaint"
  ];

  const statuses = ["achieved", "achieved", "achieved", "partially_achieved", "in_progress", "not_achieved"];
  const risks = ["low", "moderate", "high", "critical"];
  const complaintOutcomes = ["Favorable Finding", "Settlement / Mediation", "Corrective Action Ordered"];

  for (let i = 0; i < 35; i++) {
    const studentId = students.length > 0 ? students[i % students.length].id : i + 1;
    const oType = outcomeTypes[i % outcomeTypes.length];
    const status = statuses[i % statuses.length];
    const risk = risks[i % risks.length];
    const isComplaint = oType === "state_complaint";
    const compOutcome = isComplaint ? complaintOutcomes[i % complaintOutcomes.length] : null;
    const resDays = 14 + (i * 3) % 45;

    await queryCloudflareD1(`
      INSERT INTO advocacy_case_outcomes (
        tenant_id, student_contact_id, goal_description, goal_status, outcome_type,
        idea_risk_level, escalated, complaint_filed, complaint_outcome, time_to_resolution_days,
        details, recorded_by, created_at
      ) VALUES (
        'waypoint', ${studentId}, 'Secure comprehensive sensory breaks and 60min weekly specialized 1:1 reading intervention',
        '${status}', '${oType}', '${risk}', ${risk === "high" || risk === "critical" ? 1 : 0},
        ${isComplaint ? 1 : 0}, ${compOutcome ? `'${compOutcome}'` : "NULL"}, ${resDays},
        'IEP team consensus achieved after multi-disciplinary evaluation presentation.', ${primaryAdvocateId}, CURRENT_TIMESTAMP
      )
    `);
  }

  // 4. Seed Client Satisfaction Surveys
  console.log("Seeding Client Satisfaction Surveys...");
  const testimonials = [
    "Byron and the Waypoint team saved my son's high school career. The IEP goals are finally measurable and actionable!",
    "I walked into the meeting terrified. Having our advocate right beside me gave me the strength and clarity I needed.",
    "The Case Compass and portal kept us informed every single step of the way. Unbelievably thorough service.",
    "Prompt, caring, and deeply knowledgeable in Georgia special education law. Worth every penny.",
    "They caught 3 critical evaluation discrepancies the school had glossed over. Absolutely indispensable."
  ];

  for (let i = 0; i < 28; i++) {
    const studentId = students.length > 0 ? students[i % students.length].id : i + 1;
    const overall = i % 10 === 0 ? 4 : 5;
    const advRating = 5;
    const commRating = i % 8 === 0 ? 4 : 5;
    const prepRating = 5;
    const portalRating = i % 6 === 0 ? 4 : 5;
    const nps = i % 12 === 0 ? 9 : 10;
    const hasTestimonial = i < testimonials.length;
    const testText = hasTestimonial ? testimonials[i] : null;

    await queryCloudflareD1(`
      INSERT INTO client_satisfaction_surveys (
        tenant_id, family_contact_id, student_contact_id, advocate_user_id,
        overall_rating, advocate_rating, communication_rating, meeting_prep_rating, portal_rating,
        confidence_gained, goals_achieved, nps_score, survey_type, testimonial_text, testimonial_permission, created_at
      ) VALUES (
        'waypoint', ${studentId}, ${studentId}, ${i % 2 === 0 ? primaryAdvocateId : secondaryAdvocateId},
        ${overall}, ${advRating}, ${commRating}, ${prepRating}, ${portalRating},
        1, 1, ${nps}, 'post_meeting', ${testText ? `'${testText.replace(/'/g, "''")}'` : "NULL"}, ${hasTestimonial ? 1 : 0}, CURRENT_TIMESTAMP
      )
    `);
  }

  // 5. Seed Membership Plan History
  console.log("Seeding Membership Plan History...");
  for (let i = 1; i <= 40; i++) {
    const studentId = students.length > 0 ? students[i % students.length].id : i;
    const plan = i % 4 === 0 ? "$105" : i % 6 === 0 ? "Scholarship" : "$55";
    const amount = plan === "$105" ? 105.0 : plan === "Scholarship" ? 0.0 : 55.0;
    const effective = new Date(now - (i * 2) * DAY_MS).toISOString().split("T")[0];

    await queryCloudflareD1(`
      INSERT INTO membership_plan_history (
        tenant_id, contact_id, event_type, from_plan, to_plan, billing_cadence,
        monthly_amount, collected_amount, effective_date, created_at
      ) VALUES (
        'waypoint', ${studentId}, 'new_signup', NULL, '${plan}', 'monthly',
        ${amount}, ${amount}, '${effective}', '${effective} 10:00:00'
      )
    `);

    // A couple upgrades / downgrades / cancellations
    if (i === 10) {
      await queryCloudflareD1(`
        INSERT INTO membership_plan_history (
          tenant_id, contact_id, event_type, from_plan, to_plan, billing_cadence,
          monthly_amount, collected_amount, effective_date, created_at
        ) VALUES (
          'waypoint', ${studentId}, 'upgrade', '$55', '$105', 'monthly',
          105.00, 105.00, '${effective}', '${effective} 12:00:00'
        )
      `);
    } else if (i === 20) {
      await queryCloudflareD1(`
        INSERT INTO membership_plan_history (
          tenant_id, contact_id, event_type, from_plan, to_plan, billing_cadence,
          monthly_amount, collected_amount, cancellation_reason, cancellation_note, effective_date, created_at
        ) VALUES (
          'waypoint', ${studentId}, 'cancellation', '$55', 'Cancelled', 'monthly',
          0.00, 0.00, 'Attorney needed', 'Case transitioned to special ed trial attorney for federal litigation.', '${effective}', '${effective} 15:00:00'
        )
      `);
    }
  }

  console.log("=== Seeded initial historical data successfully! ===");
}

seedMetricsData().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
