import { OpenAIApiStream } from './../../utils/indext';
export const config = {
	runtime: "edge"
};

const handler = async (req: Request): Promise<Response> => {
	try {
		const {prompt} = (await req.json()) as {prompt: string}
		const stream = await OpenAIApiStream(prompt);
		return new Response(stream, {status: 200})
	} catch (error) {
		return new Response("Error", {status: 500})
	}
}

export default handler;