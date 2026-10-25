import { NextRequest, NextResponse } from "next/server";
import { hasLuAdminAccess } from "@/lib/education/lu-teacher-auth";
import { getLuProject, getLuVersions } from "@/lib/education/lu-storage";
import { getLuTrackOrder } from "@/lib/education/lu-track-order";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const admin = await hasLuAdminAccess();
    const publicView = request.nextUrl.searchParams.get("view") === "public";
    const [project, trackOrder] = await Promise.all([getLuProject(), getLuTrackOrder()]);
    const versions = project.media_authorized && (admin || project.family_released)
      ? await getLuVersions(publicView || !admin) : [];
    const response = NextResponse.json({
      project: admin ? project : { family_released: project.family_released },
      versions: admin && !publicView ? versions : versions.map(({ id, track_id, url }) => ({ id, track_id, url })),
      trackOrder, admin: admin && !publicView,
      teacherPreview: publicView && admin && project.media_authorized && !project.family_released,
    });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    return NextResponse.json({ error: "Armazenamento em preparação", versions: [],
      project: { family_released: false } }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
