import Head from 'next/head'

import { useState } from 'react'
import { FSChunk } from '@/types'
import endent from 'endent'

export default function Home() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [chunks, setChunks] = useState<FSChunk[]>([]);
  const [loading, setLoading] = useState(false);

  const handleAnswer = async () => {
    setAnswer("")
    setLoading(true)
    const searchReponse = await fetch('/api/search', {
      method: 'POST',
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query })
    });

    if (!searchReponse.ok) {
      return;
    }

    const results: FSChunk[] = await searchReponse.json();
    console.log("=====>",results)
    const uniqueChunks: FSChunk[] = results.filter((chunk, index, self) =>
      index === self.findIndex(c => c.article_title === chunk.article_title)
    ); 
    console.log("=====>",uniqueChunks)

    setChunks([...uniqueChunks]);

    const prompt = endent`
      Use the following passages to answer the query: ${query}
      ${results.map((chunk) => chunk.content).join("\n")}
    `

    const answerResponse = await fetch('/api/answer', {
      method: 'POST',
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt })
    })
    setQuery("")


    if (!answerResponse.ok) {
      return;
    }


    const data = answerResponse.body;

    if (!data) {
      return;
    }

    const reader = data.getReader();
    const decoder = new TextDecoder();
    let done = false;
    setLoading(false)

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      const chunkValue = decoder.decode(value);
      setAnswer(prev => prev + chunkValue);
    }

  }
  return (
    <>
      <Head>
        <title>Ask Farnam Street: Decision Making</title>
        <meta name="description" content="allows users to generate to ge advice from FS blog" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className='flex flex-col min-h-screen mx-auto px-4 p-10 md:w-6/12 sm:w-full'>
        <div className='text-lg bg-blue-100 rounded-md p-3 my-2'><h3 className='text-gray-500'>Let Farnam Street answer your Decision Making questions based on articles at: </h3> <a className='text-black underline' href='https://fs.blog/category/decision-making' target="_blank" rel="noopener noreferrer">fs.blog/decision-making</a> </div>
        <div className='flex flex-col'>
          <textarea
            className="border text-black border-gray-300 rounded-md p-2"
            name="query"
            id="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)} />
          <button
            className='border rounded-md p-2 bg-blue-300 hover:bg-blue-900 hover:text-white w-32 self-end my-2'
            onClick={handleAnswer}
            disabled={loading || (query === "")}
          >
            Ask FS
          </button>
        </div>
        <div>
          {loading ? <p>Getting answers from Farnam Street...</p> : answer && !loading ? <p className='border text-black border-gray-300 rounded-md p-4 bg-gray-100'>{answer}</p> : <></>}
        </div>
        <div>
          {chunks.length > 0 && !loading ? <h3 className='py-4'>Read the Sources: </h3> : <></>}
          <div className='grid md:grid-cols-3 gap-4'>
            {!loading && chunks.map(chunk =>
              <a className='py-3 px-5 rounded-md bg-red-100 self-start' href={chunk.article_url} target="_blank" rel="noopener noreferrer" key={chunk.content_token}>{chunk.article_title}</a>
            )}
          </div>
          <div>

          </div>
        </div>
      </main>
      <footer className='container'>
        <p>Created by: <a href='https://www.twitter.com/willies_wanjala' >Willies Wanjala</a></p>
      </footer>
    </>
  )
}
