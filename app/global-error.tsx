"use client";

// Use the React (browser) SDK on the client to avoid bundling server integrations
import * as Sentry from "@sentry/react";
import Error from "next/error";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        {/* Your Error component here... */}      
      </body>
    </html>
  );
}