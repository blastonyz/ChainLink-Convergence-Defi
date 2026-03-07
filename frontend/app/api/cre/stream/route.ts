import { NextRequest } from "next/server";
import { spawn } from "node:child_process";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StreamEvent = "start" | "log" | "operation" | "error" | "done";

const encoder = new TextEncoder();

const formatSse = (event: StreamEvent, payload: unknown) =>
  encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);

export async function GET(request: NextRequest) {
  const verboseParam = request.nextUrl.searchParams.get("verbose");
  const broadcastParam = request.nextUrl.searchParams.get("broadcast");
  const triggerChoiceParam = request.nextUrl.searchParams.get("triggerChoice");
  const httpPayloadParam = request.nextUrl.searchParams.get("httpPayload");
  const verbose = verboseParam === "1" || verboseParam === "true";
  const broadcast = broadcastParam == null ? true : broadcastParam === "1" || broadcastParam === "true";
  const triggerChoice = (triggerChoiceParam && triggerChoiceParam.trim().length > 0 ? triggerChoiceParam.trim() : "2");
  const httpPayload = httpPayloadParam && httpPayloadParam.trim().length > 0 ? httpPayloadParam.trim() : "{}";
  const workspaceRoot = path.resolve(process.cwd(), "..");

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const args = ["workflow", "simulate", "./my-workflow", "-T", "staging-settings", "-e", ".env"];
      if (verbose) {
        args.push("-v");
      }
      if (broadcast) {
        args.push("--broadcast");
      }

      const child = spawn("cre", args, {
        cwd: workspaceRoot,
        shell: process.platform === "win32",
        env: process.env,
      });

      let triggerSent = false;
      let payloadSent = false;
      let payloadFallbackTimer: NodeJS.Timeout | null = null;

      const writeToStdin = (value: string) => {
        if (!child.stdin.destroyed && child.stdin.writable) {
          child.stdin.write(`${value}\n`);
          return true;
        }
        return false;
      };

      const maybeSendInteractiveInput = (line: string) => {
        const normalized = line.toLowerCase();

        const triggerPromptDetected =
          normalized.includes("please select a trigger") ||
          normalized.includes("enter your choice");

        if (!triggerSent && triggerPromptDetected) {
          const wrote = writeToStdin(triggerChoice);
          if (wrote) {
            triggerSent = true;
            controller.enqueue(formatSse("log", { stream: "stdin", line: `[stdin] trigger=${triggerChoice}` }));
          }
          return;
        }

        const payloadPromptDetected =
          normalized.includes("enter your input") ||
          normalized.includes("please provide json input for the http trigger");

        if (!payloadSent && payloadPromptDetected) {
          const wrote = writeToStdin(httpPayload);
          if (wrote) {
            payloadSent = true;
            controller.enqueue(formatSse("log", { stream: "stdin", line: `[stdin] http-payload=${httpPayload}` }));
          }
          return;
        }

        if (!payloadSent && normalized.includes("http trigger configuration") && !payloadFallbackTimer) {
          payloadFallbackTimer = setTimeout(() => {
            if (payloadSent) {
              return;
            }
            const wrote = writeToStdin(httpPayload);
            if (wrote) {
              payloadSent = true;
              controller.enqueue(
                formatSse("log", { stream: "stdin", line: `[stdin-fallback] http-payload=${httpPayload}` }),
              );
            }
          }, 1200);
        }
      };

      controller.enqueue(
        formatSse("start", {
          command: `cre ${args.join(" ")}`,
          cwd: workspaceRoot,
          startedAt: new Date().toISOString(),
        }),
      );

      let stdoutBuffer = "";
      let stderrBuffer = "";

      const flushLines = (raw: string, onLine: (line: string) => void) => {
        const lines = raw.split(/\r?\n/);
        for (let i = 0; i < lines.length - 1; i += 1) {
          const line = lines[i].trimEnd();
          if (line.length > 0) {
            onLine(line);
          }
        }
        return lines[lines.length - 1] ?? "";
      };

      const handleStdoutLine = (line: string) => {
        controller.enqueue(formatSse("log", { stream: "stdout", line }));
        maybeSendInteractiveInput(line);

        const marker = "[OPERATION_LOG]";
        const markerIndex = line.indexOf(marker);
        if (markerIndex === -1) {
          return;
        }

        const jsonPart = line.slice(markerIndex + marker.length).trim();
        if (!jsonPart) {
          return;
        }

        try {
          const parsed = JSON.parse(jsonPart) as unknown;
          controller.enqueue(formatSse("operation", parsed));
        } catch {
          controller.enqueue(
            formatSse("error", {
              message: "Failed to parse OPERATION_LOG JSON",
              raw: jsonPart,
            }),
          );
        }
      };

      const handleStderrLine = (line: string) => {
        controller.enqueue(formatSse("log", { stream: "stderr", line }));
      };

      child.stdout.on("data", (chunk: Buffer | string) => {
        stdoutBuffer += chunk.toString();
        stdoutBuffer = flushLines(stdoutBuffer, handleStdoutLine);
      });

      child.stderr.on("data", (chunk: Buffer | string) => {
        stderrBuffer += chunk.toString();
        stderrBuffer = flushLines(stderrBuffer, handleStderrLine);
      });

      child.on("error", (error) => {
        controller.enqueue(
          formatSse("error", {
            message: error.message,
          }),
        );
        controller.enqueue(formatSse("done", { exitCode: -1, success: false }));
        controller.close();
      });

      child.on("close", (code) => {
        if (payloadFallbackTimer) {
          clearTimeout(payloadFallbackTimer);
          payloadFallbackTimer = null;
        }

        if (stdoutBuffer.trim().length > 0) {
          handleStdoutLine(stdoutBuffer.trimEnd());
        }
        if (stderrBuffer.trim().length > 0) {
          handleStderrLine(stderrBuffer.trimEnd());
        }

        controller.enqueue(
          formatSse("done", {
            exitCode: code ?? -1,
            success: (code ?? -1) === 0,
            finishedAt: new Date().toISOString(),
            triggerChoice,
          }),
        );
        controller.close();
      });

      request.signal.addEventListener("abort", () => {
        if (payloadFallbackTimer) {
          clearTimeout(payloadFallbackTimer);
          payloadFallbackTimer = null;
        }
        child.kill();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
