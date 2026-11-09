import { createFileRoute } from "@tanstack/react-router";
import { DriverUploadForm } from "@/components/driver-upload-form";

export const Route = createFileRoute("/upload/$token")({
  head: () => ({ meta: [
    { title: "Upload your documents — FleetGuard" },
    { name: "description", content: "Securely send compliance documents for owner review." },
    { property: "og:title", content: "Upload your documents — FleetGuard" },
    { property: "og:description", content: "Securely send compliance documents for owner review." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  component: Upload,
});
function Upload() { const { token } = Route.useParams(); return <DriverUploadForm token={token} />; }