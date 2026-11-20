import { NextRequest, NextResponse } from "next/server";
import { hasLuAdminAccess } from "@/lib/education/lu-teacher-auth";
import { getLuProject, getLuVersions } from "@/lib/education/lu-storage";
import { getLuIllustrations } from "@/lib/education/lu-illustrations";
import { getLuLyrics } from "@/lib/education/lu-lyrics";
import { getLuTrackOrder } from "@/lib/education/lu-track-order";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const admin = await hasLuAdminAccess();
    const publicView = request.nextUrl.searchParams.get("view") === "public";
    const [project, trackOrder] = await Promise.all([getLuProject(), getLuTrackOrder()]);
    const lyrics = await getLuLyrics({ admin, publicView, mediaAuthorized: project.media_authorized, familyReleased: project.family_released });
    const illustrations = await getLuIllustrations({ admin, publicView, authorized: project.media_authorized, released: project.illustrations_released });
    const versions = project.media_authorized && (admin || project.family_released)
      ? await getLuVersions(publicView || !admin) : [];
    const response = NextResponse.json({
      project: admin ? project : { family_released: project.family_released, illustrations_released: project.illustrations_released },
      illustrations: admin && !publicView ? illustrations : illustrations.map(({ id, track_id, is_featured, url }) => ({ id, track_id, is_featured, url })),
      illustrationsPreview: publicView && admin && project.media_authorized && !project.illustrations_released,
      versions: admin && !publicView ? versions : versions.map(({ id, track_id, url }) => ({ id, track_id, url })),
      trackOrder, lyrics, admin: admin && !publicView,
      teacherPreview: publicView && admin && project.media_authorized && !project.family_released,
    });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    return NextResponse.json({ error: "Armazenamento em preparação", versions: [],
      project: { family_released: false } }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
