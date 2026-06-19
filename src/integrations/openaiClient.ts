import OpenAI, { toFile } from "openai";
import type { AppConfig } from "@/config";
import { parseAiExtraction } from "@/core/schema";
import type { AiExtraction, CaptureJob, ProjectRecord } from "@/core/types";

export type OpenAiClient = {
  extract(input: ExtractInput): Promise<AiExtraction>;
  updateProjectState(input: UpdateProjectStateInput): Promise<string>;
};

export type ExtractInput = {
  job: CaptureJob;
  knownProjects: ProjectRecord[];
  prompt: string;
  telegramFileUrl?: string;
};

export type UpdateProjectStateInput = {
  prompt: string;
  existingState?: string;
  newSummary: string;
  recentSummaries: string[];
  openTasks: string[];
};

export function createOpenAiClient(config: AppConfig): OpenAiClient {
  const client = new OpenAI({ apiKey: config.openaiApiKey });

  return {
    async extract(input) {
      // Media is first reduced to text/transcript, then the shared extraction
      // prompt turns all capture types into the same JSON contract.
      const extractedText = await getCaptureText(client, config, input);
      const content = [
        `${input.prompt}`,
        "",
        `Known projects: ${input.knownProjects.map((project) => project.name).join(", ") || "none"}`,
        input.job.userHint
          ? `User hint: ${input.job.userHint}`
          : "User hint: none",
        "",
        `Extracted content:\n${extractedText}`,
      ].join("\n");

      const completion = await client.chat.completions.create({
        model: config.openaiTextModel,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Return only valid JSON matching the requested shape.",
          },
          { role: "user", content },
        ],
      });

      const raw = completion.choices[0]?.message.content;

      if (!raw) {
        throw new Error("OpenAI returned an empty extraction response");
      }

      return parseAiExtraction(JSON.parse(raw));
    },

    async updateProjectState(input) {
      const completion = await client.chat.completions.create({
        model: config.openaiTextModel,
        messages: [
          { role: "system", content: input.prompt },
          {
            role: "user",
            content: [
              `Existing state:\n${input.existingState || "(empty)"}`,
              "",
              `New approved note:\n${input.newSummary}`,
              "",
              `Recent notes:\n${input.recentSummaries.join("\n") || "(none)"}`,
              "",
              `Open tasks:\n${input.openTasks.join("\n") || "(none)"}`,
            ].join("\n"),
          },
        ],
      });

      return completion.choices[0]?.message.content?.trim() || input.newSummary;
    },
  };
}

async function getCaptureText(
  client: OpenAI,
  config: AppConfig,
  input: ExtractInput,
): Promise<string> {
  if (input.job.sourceType === "text") {
    return input.job.text ?? "";
  }

  if (!input.telegramFileUrl) {
    throw new Error("Capture media is missing a file URL");
  }

  if (input.job.sourceType === "voice") {
    const response = await fetch(input.telegramFileUrl);

    if (!response.ok) {
      throw new Error("Could not download Telegram voice file");
    }

    const bytes = await response.arrayBuffer();
    const file = await toFile(Buffer.from(bytes), "voice.ogg");
    const transcription = await client.audio.transcriptions.create({
      model: config.openaiTranscribeModel,
      file,
    });

    return transcription.text;
  }

  const response = await fetch(input.telegramFileUrl);

  if (!response.ok) {
    throw new Error("Could not download Telegram image file");
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const mimeType = response.headers.get("content-type") ?? "image/jpeg";
  // Vision input is sent as a transient data URL. Notion stores only text fields
  // unless a later feature explicitly adds media retention.
  const dataUrl = `data:${mimeType};base64,${bytes.toString("base64")}`;

  const completion = await client.chat.completions.create({
    model: config.openaiVisionModel,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Read this sketchpad/photo. Return the visible text and useful context only.",
          },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
  });

  return completion.choices[0]?.message.content?.trim() || "";
}
