import { router } from "./_core/trpc";
import { portalAuthRouter } from "./routers/portalAuth";
import { smartFilesRouter } from "./routers/smartFiles";
import { techTasksRouter } from "./routers/techTasks";
import { systemRouter } from "./_core/systemRouter";
import { voiceRouter } from "./routers/voice";
import { authRouter } from "./routers/auth";
import { contactsRouter } from "./routers/contacts";
import { leadsRouter } from "./routers/leads";
import { projectsRouter } from "./routers/projects";
import { tasksRouter } from "./routers/tasks";
import { invoicesRouter } from "./routers/invoices";
import { contractsRouter } from "./routers/contracts";
import { appointmentsRouter } from "./routers/appointments";
import { messagesRouter } from "./routers/messages";
import { availabilityRouter } from "./routers/availability";
import { clientFilesRouter } from "./routers/clientFiles";
import { vaultRouter } from "./routers/vault";
import { portalRouter } from "./routers/portal";
import { caseCompassRouter } from "./routers/caseCompass";
import { iepRouter } from "./routers/iep";
import { sessionTypesRouter } from "./routers/sessionTypes";
import { webhooksRouter } from "./routers/webhooks";
import { workflowsRouter } from "./routers/workflows";
import { internalTasksRouter } from "./routers/internalTasks";
import { knowledgeBaseRouter } from "./routers/knowledgeBase";
import { timeTrackerRouter } from "./routers/timeTracker";
import { walkthroughsRouter } from "./routers/walkthroughs";
import { aiRouter } from "./routers/ai";
import { callLogsRouter } from "./routers/callLogs";
import { teamRouter } from "./routers/team";
import { stateComplaintRouter } from "./routers/stateComplaint";
import { brainDumpRouter } from "./routers/brainDump";
import { billGuardianRouter } from "./routers/billGuardian";
import { notesRouter } from "./routers/notes";
import { aiConnectionsRouter } from "./routers/aiConnections";
import { quickSetupRouter } from "./routers/quickSetup";
import { leadFormsRouter } from "./routers/leadForms";
import { intakeRouter } from "./routers/intake";
import { brainDumpImagesRouter } from "./routers/brainDumpImages";
import { discoveryRouter } from "./routers/discovery";
import { resourcesRouter } from "./routers/resources";
import { emailTemplatesRouter } from "./routers/emailTemplates";

export const appRouter = router({
  portalAuth: portalAuthRouter,
  smartFiles: smartFilesRouter,
  techTasks: techTasksRouter,
  system: systemRouter,
  voice: voiceRouter,
  auth: authRouter,
  contacts: contactsRouter,
  leads: leadsRouter,
  projects: projectsRouter,
  tasks: tasksRouter,
  invoices: invoicesRouter,
  contracts: contractsRouter,
  appointments: appointmentsRouter,
  messages: messagesRouter,
  availability: availabilityRouter,
  clientFiles: clientFilesRouter,
  vault: vaultRouter,
  portal: portalRouter,
  caseCompass: caseCompassRouter,
  iep: iepRouter,
  sessionTypes: sessionTypesRouter,
  webhooks: webhooksRouter,
  workflows: workflowsRouter,
  internalTasks: internalTasksRouter,
  knowledgeBase: knowledgeBaseRouter,
  timeTracker: timeTrackerRouter,
  walkthroughs: walkthroughsRouter,
  ai: aiRouter,
  callLogs: callLogsRouter,
  team: teamRouter,
  stateComplaint: stateComplaintRouter,
  brainDump: brainDumpRouter,
  billGuardian: billGuardianRouter,
  notes: notesRouter,
  aiConnections: aiConnectionsRouter,
  quickSetup: quickSetupRouter,
  leadForms: leadFormsRouter,
  intake: intakeRouter,
  brainDumpImages: brainDumpImagesRouter,
  discovery: discoveryRouter,
  resources: resourcesRouter,
  emailTemplates: emailTemplatesRouter,
});

export type AppRouter = typeof appRouter;
