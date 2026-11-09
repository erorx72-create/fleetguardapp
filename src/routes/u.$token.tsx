import { createFileRoute } from "@tanstack/react-router";
import { DriverUploadForm } from "@/components/driver-upload-form";

export const Route = createFileRoute("/u/$token")({
  head: () => ({ meta: [
    { title: "Driver document submission — FleetGuard" },
    { name: "description", content: "Securely submit a document to your fleet safety manager for review." },
    { property: "og:title", content: "Driver document submission — FleetGuard" },
    { property: "og:description", content: "Securely submit a document for manual review." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  component: Upload,
});
function Upload() { const { token } = Route.useParams(); return <DriverUploadForm token={token} />; }