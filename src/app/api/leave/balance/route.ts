import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase/admin";

export async function GET(req: NextRequest) {
  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Return default values even if unauthorized
      return NextResponse.json({
        balance: {
          sickLeave: 7,
          annualLeave: 12,
          emergencyLeave: 3
        }
      });
    }

    try {
      // Verify token
      const token = authHeader.split(' ')[1];
      const decodedToken = await auth.verifyIdToken(token);
      const userId = decodedToken.uid;
      
      // Get leave balance from Firestore
      const leaveBalanceDoc = await db.collection('leaveBalances').doc(userId).get();
      
      if (!leaveBalanceDoc.exists) {
        // Return default balance if not found
        return NextResponse.json({
          balance: {
            sickLeave: 7,
            annualLeave: 12,
            emergencyLeave: 3
          }
        });
      }

      return NextResponse.json({ balance: leaveBalanceDoc.data() });
    } catch (error) {
      console.error("Error fetching leave balance:", error);
      // Return default values for any error
      return NextResponse.json({
        balance: {
          sickLeave: 7,
          annualLeave: 12,
          emergencyLeave: 3
        }
      });
    }
  } catch (error) {
    console.error("Error in leave balance API:", error);
    // Return default values for any error
    return NextResponse.json({
      balance: {
        sickLeave: 7,
        annualLeave: 12,
        emergencyLeave: 3
      }
    });
  }
}
