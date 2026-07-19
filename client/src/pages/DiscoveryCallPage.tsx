import { useParams } from "wouter";
import DiscoveryCall from "./DiscoveryCall";
import NotFound from "./NotFound";

export default function DiscoveryCallPage() {
  const params = useParams<{ leadId: string }>();
  const leadId = parseInt(params.leadId ?? "");
  if (!leadId || isNaN(leadId)) return <NotFound />;
  return <DiscoveryCall leadId={leadId} />;
}
