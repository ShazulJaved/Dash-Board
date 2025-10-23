import { NextResponse } from "next/server";
import { attendanceService } from "@/lib/services/attendanceService";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        const records = await attendanceService.getMonthlyAttendance(userId);
        return NextResponse.json({ records }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}