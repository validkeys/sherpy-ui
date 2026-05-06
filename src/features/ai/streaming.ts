import {
  InvokeModelWithResponseStreamCommand,
  type ResponseStream,
} from "@aws-sdk/client-bedrock-runtime";
import { BEDROCK_MODEL_ID, bedrockClient } from "@/lib/bedrock";

export async function streamQuestion(
  messages: Array<{ role: string; content: string }>,
): Promise<ReadableStream<string>> {
  const cmd = new InvokeModelWithResponseStreamCommand({
    modelId: BEDROCK_MODEL_ID,
    contentType: "application/json",
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 512,
      messages,
    }),
  });
  const res = await bedrockClient.send(cmd);

  return new ReadableStream<string>({
    async start(controller) {
      try {
        if (!res.body) {
          controller.close();
          return;
        }
        for await (const event of res.body as AsyncIterable<ResponseStream>) {
          if (event.chunk?.bytes) {
            const chunk = JSON.parse(
              new TextDecoder().decode(event.chunk.bytes),
            );
            if (chunk.type === "content_block_delta") {
              controller.enqueue(chunk.delta.text);
            }
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}
