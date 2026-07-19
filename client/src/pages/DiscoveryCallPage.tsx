import { useParams } from "wouter";
import DiscoveryCall from "./DiscoveryCall";
import NotFound from "./NotFound";

export default function DiscoveryCallPage() {
  const params = useParams<{ leadId: string }>();
  const leadId = parseInt(params.leadId ?? "");
  // Allow leadId=0 as a template/preview mode (no specific lead)
  if (isNaN(leadId) || leadId < 0) return <NotFound />;
  return <DiscoveryCall leadId={leadId} />;
}
