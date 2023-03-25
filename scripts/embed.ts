import { FSArticle, FSJson } from './../types/index';
import { loadEnvConfig } from '@next/env';
import { Configuration, OpenAIApi } from 'openai';
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { resolve } from 'path';

loadEnvConfig("");

const generateEmbedings = async (articles: FSArticle[]) => {
	const configuration = new Configuration({
		apiKey: process.env.OPEN_AI_API_KEY
	});

	const openai = new OpenAIApi(configuration);
	const supabase = createClient(
		process.env.NEXT_PUBLIC_SUPERBASE_URL!,
		process.env.SUPERBASE_SERVICE_ROLE_KEY!
	)

	for (let i = 0; i < articles.length; i++) {
		const article = articles[i];

		for (let j = 0; j < article.chunks.length; j++) {
			const chunk = article.chunks[j];

			const embeddingResponse = await openai.createEmbedding({
				model: 'text-embedding-ada-002',
				input: chunk.content
			})

			const [{ embedding }] = embeddingResponse.data.data;

			const { data, error } = await supabase
				.from('fs')
				.insert({
					article_title: chunk.article_title,
					article_url: chunk.article_url,
					content: chunk.content,
					content_token: chunk.content_token,
					embedding
				})
				.select("*");

				if(error){
					console.log(error)
				} else {
					console.log('saved', i, j)
				}

				await new Promise((resolve) => setTimeout(resolve, 300));
		}
	}
}


(async () => {
	const json: FSJson = JSON.parse(fs.readFileSync('scripts/fs.json', 'utf-8'))

	await generateEmbedings(json.articles)
})()