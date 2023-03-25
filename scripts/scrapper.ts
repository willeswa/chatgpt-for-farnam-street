import { FSArticle, FSChunk, FSJson } from "@/types";
import axios from "axios";
import * as cheerio from "cheerio";
import { encode } from "gpt-3-encoder";
import fs from "fs";

const BASE_URL = "https://fs.blog/category/decision-making";
const CHUNK_SIZE = 200;

let page = 1;
let gotToNextPage = true;


function cleanText(article: string) {
	// remove breaklines and replace with spaces
	let cleaned = article.replace(/\r?\n|\r/g, ' ');
	// remove special characters but preserve quotes and punctuation
	cleaned = cleaned.replace(/[^\w\s’“”'.,!?;:–-]/gi, '');
	return cleaned;
  }

const getLinks = async () => {
	const articleLinks: { title: string, url: string }[] = []
	do {
		let baseUrl = `${BASE_URL}`
		if (page == 1) {
			baseUrl
		} else {
			baseUrl = `${BASE_URL}/page/${page}`
		}

		try {
			const html = await axios.get(`${baseUrl}`);
			const $ = cheerio.load(html.data);
			const articles = $("#genesis-content");
			const links = articles.find('a').filter('.entry-title-link');

			links.each((i, link) => {
				const url = $(link).attr('href');
				const title = $(link).text();
				if (url) {
					let linkObject = {
						title,
						url
					}
					articleLinks.push(linkObject)
				}
			})

			page += 1

		} catch (error) {
			gotToNextPage = false;
		}

	} while (gotToNextPage)

	return articleLinks;
}

const getArticles = async (url: string, title: string) => {
	let fsArticle: FSArticle = {
		title: "",
		url: "",
		content: "",
		tokens: 0,
		chunks: []
	}

	const html = await axios(url);
	const $ = cheerio.load(html.data);
	const article = $(".entry-content-single").text();
	const text = cleanText(article)

	fsArticle = {
		title,
		url,
		content: text,
		tokens: encode(text).length,
		chunks: []
	}

	return fsArticle;
}	

const getChunks = async (article: FSArticle) => {
	const {title, url, content} = article;

	let textChunks: string[] = [];

	if(encode(article.content).length > CHUNK_SIZE){
		const split = content.split(". ")
		let chunkedText = ""
		split.forEach(sentence => {
			const sentenceTokens = encode(sentence).length;
			const chunkedTextTokens = encode(chunkedText).length;
			const tokens = sentenceTokens + chunkedTextTokens
	
			if(tokens > CHUNK_SIZE){
				textChunks.push(chunkedText)
				chunkedText = ""
			}

			if(sentence[sentence.length - 1] && sentence[sentence.length - 1].match(/[a-z0-9]/i)){
				chunkedText += sentence + ". "
			} else {
				chunkedText += sentence + " "
			}
		})
		textChunks.push(chunkedText.trim())
	} else {
		textChunks.push(content.trim())
	}

	const articleChunks: FSChunk[] = textChunks.map((chunkText, i) => {
		const chunk: FSChunk = {
			article_title: title,
			article_url: url,
			content: chunkText,
			content_token: encode(chunkText).length,
			embedding: []
		}

		return chunk;
	})
	const chunckedArticle = {
		...article,
		chunks: articleChunks
	}

	return chunckedArticle;
}
  
  

(async () => {
	const links = await getLinks();
	let articles: FSArticle[] = [];

	for(let i = 0; i < links.length; i++){
		let link = links[i]
		const article = await getArticles(link.url, link.title)
		const chunk = await getChunks(article)
		articles.push(chunk)
	}

	const json: FSJson = {
		tokens: articles.reduce((acc, article) => acc + article.tokens, 0),
		articles
	}

	fs.writeFileSync("scripts/fs.json", JSON.stringify(json));
})();
