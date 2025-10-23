import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";

// Handle POST requests to create a leave or document request
export async function POST(req: NextRequest) {
  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify token
    const token = authHeader.split(" ")[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Parse request body
    const requestData = await req.json();
    const requestType = requestData.type || "leave"; // Default to leave if not specified

    // Get user data to find reporting manager
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data();
    const reportingManagerId = userData?.reportingManagerId;
    const reportingManagerName = userData?.reportingManager;

    if (requestType === "document") {
      // Handle document request
      if (!requestData.documentType || !requestData.reason) {
        return NextResponse.json(
          { error: "Missing required fields for document request" },
          { status: 400 }
        );
      }

      // Prepare document request data
      const documentData = {
        userId,
        userName: userData?.displayName || decodedToken.email,
        documentType: requestData.documentType,
        reason: requestData.reason,
        status: "pending",
        createdAt: Timestamp.now(),
        reportingManagerId: reportingManagerId || null,
        reportingManagerName: reportingManagerName || null,
      };

      // Submit document request
      const docRef = await db.collection("documentRequests").add(documentData);

      // Notify reporting manager if available
      if (reportingManagerId) {
        await db.collection("notifications").add({
          userId: reportingManagerId,
          type: "document_request",
          title: "New Document Request",
          message: `${userData?.displayName || "A user"} has requested a ${
            requestData.documentType
          } document`,
          relatedId: docRef.id,
          createdAt: Timestamp.now(),
          read: false,
        });
      }

      return NextResponse.json(
        {
          documentId: docRef.id,
          message: "Document request submitted successfully",
        },
        { status: 200 }
      );
    } else {
      // Handle leave request
      if (
        !requestData.startDate ||
        !requestData.endDate ||
        !requestData.leaveType ||
        !requestData.reason
      ) {
        return NextResponse.json(
          { error: "Missing required fields for leave request" },
          { status: 400 }
        );
      }

      // Prepare leave request data
      const leaveData = {
        userId,
        userName: userData?.displayName || decodedToken.email,
        leaveType: requestData.leaveType,
        startDate: requestData.startDate,
        endDate: requestData.endDate,
        reason: requestData.reason,
        numberOfDays: requestData.numberOfDays,
        status: "pending",
        createdAt: Timestamp.now(),
        reportingManagerId: reportingManagerId || null,
        reportingManagerName: reportingManagerName || null,
      };

      // Submit leave request
      const leaveRef = await db.collection("leaveRequests").add(leaveData);

      // Notify reporting manager if available
      if (reportingManagerId) {
        await db.collection("notifications").add({
          userId: reportingManagerId,
          type: "leave_request",
          title: "New Leave Request",
          message: `${userData?.displayName || "A user"} has requested ${
            requestData.leaveType
          } leave`,
          relatedId: leaveRef.id,
          createdAt: Timestamp.now(),
          read: false,
        });
      }

      return NextResponse.json(
        {
          leaveId: leaveRef.id,
          message: "Leave request submitted successfully",
          reportingManager: reportingManagerName || "Not assigned",
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("Request error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

function serializeData(data: any): any {
  if (!data) return null;

  if (Array.isArray(data)) {
    return data.map((item) => serializeData(item));
  }

  if (typeof data === "object") {
    if (data.toDate && typeof data.toDate === "function") {
      // Convert Firestore Timestamp to ISO string
      return data.toDate().toISOString();
    }

    const result: Record<string, any> = {};
    for (const key in data) {
      result[key] = serializeData(data[key]);
    }
    return result;
  }

  return data;
}

// Handle GET requests to fetch leave or document requests for a user
export async function GET(req: NextRequest) {
  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify token
    const token = authHeader.split(" ")[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get URL parameters
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const requestType = url.searchParams.get("type") || "leave"; // Default to leave if not specified

    try {
      if (requestType === "document") {
        // Fetch document requests
        let docQuery = db
          .collection("documentRequests")
          .where("userId", "==", userId);

        if (status) {
          docQuery = docQuery.where("status", "==", status);
        }

        try {
          // Try with ordering (requires index)
          const docSnapshot = await docQuery.orderBy("createdAt", "desc").get();

          const documentRequests: any[] = [];
          docSnapshot.forEach((doc) => {
            documentRequests.push({
              id: doc.id,
              ...doc.data(),
            });
          });

          return NextResponse.json({ documentRequests }, { status: 200 });
        } catch (indexError) {
          // Fallback if index is not ready
          console.warn(
            "Index not ready, fetching without ordering:",
            indexError
          );
          const docSnapshot = await docQuery.get();

          const documentRequests: any[] = [];
          docSnapshot.forEach((doc) => {
            documentRequests.push({
              id: doc.id,
              ...doc.data(),
            });
          });

          // Sort manually in memory
          documentRequests.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
            const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
            return dateB.getTime() - dateA.getTime();
          });

          return NextResponse.json({ documentRequests }, { status: 200 });
        }
      } else {
        // Fetch leave requests
        let leaveQuery = db
          .collection("leaveRequests")
          .where("userId", "==", userId);

        if (status) {
          leaveQuery = leaveQuery.where("status", "==", status);
        }

        try {
          // Try with ordering (requires index)
          const leaveSnapshot = await leaveQuery
            .orderBy("createdAt", "desc")
            .get();

          const leaveRequests: any[] = [];
          leaveSnapshot.forEach((doc) => {
            leaveRequests.push({
              id: doc.id,
              ...doc.data(),
            });
          });

          return NextResponse.json({ leaveRequests }, { status: 200 });
        } catch (indexError) {
          // Fallback if index is not ready
          console.warn(
            "Index not ready, fetching without ordering:",
            indexError
          );
          const leaveSnapshot = await leaveQuery.get();

          const leaveRequests: any[] = [];
          leaveSnapshot.forEach((doc) => {
            leaveRequests.push({
              id: doc.id,
              ...serializeData(doc.data()),
            });
          });

          return NextResponse.json({ leaveRequests }, { status: 200 });
        }
      }
    } catch (error) {
      console.error("Fetch requests error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  } catch (error) {
    console.error("Authentication error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 401 });
  }
}
