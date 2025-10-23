// functions/src/index.ts
import * as functions from "firebase-functions";

// Add a simple function to make the deployment work
export const helloWorld = functions.https.onRequest((request, response) => {
  response.send("Hello from Firebase!");
});
