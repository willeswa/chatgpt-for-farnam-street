export type FSArticle = {
	title: string;
	url: string;
	content: string;
	tokens: number;
	chunks: FSChunk[];
}
export type FSChunk = {
	article_title: string;
	article_url: string;
	content: string;
	content_token: number;
	embedding: number[];

}
export type FSJson = {
	tokens: number,
	articles: FSArticle[]
}