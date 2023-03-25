import { FSChunk } from './../types/index';

import { createClient } from "@supabase/supabase-js";
import { createParser, ParsedEvent, ReconnectInterval } from 'eventsource-parser';
import { decode } from 'punycode';

export const supabaseAdmin = createClient(
	process.env.NEXT_PUBLIC_SUPERBASE_URL!,
	process.env.SUPERBASE_SERVICE_ROLE_KEY!
)

export const OpenAIApiStream = async (prompt: string) => {

	const response = await fetch("https://api.openai.com/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${process.env.OPEN_AI_API_KEY!}`
		},
		body: JSON.stringify({
			model: "gpt-3.5-turbo",
			messages: [{
				role: "system",
				content: "You're a helpful assistant that answers questions on decision making. Response should be in 3-5 sentences."
			}, {
				role: 'user',
				content: prompt
			}],
			max_tokens: 150,
			temperature: 0.0,
			stream: true
		})
	});
	if (response.status != 200) {
		throw new Error(`status ${response.status}, response: ${response.body}`);
	}
	const encoder = new TextEncoder();
	const decoder = new TextDecoder();

	const stream = new ReadableStream({
		async start(controller) {
			const onParse = (event: ParsedEvent | ReconnectInterval) => {
				if (event.type === 'event') {
					const data = event.data

					if (data === 'DONE') {
						controller.close();
						return;
					}

					try {
						const json = JSON.parse(data);
						const text = json.choices[0].delta.content;
						const queue = encoder.encode(text);
						controller.enqueue(queue);

					} catch (error) {
						controller.error(error);
					}
				}
			};
			const parser = createParser(onParse);

			for await (const chunk of response.body as any) {
				parser.feed(decoder.decode(chunk));
			}
		}
	});
	return stream;
}