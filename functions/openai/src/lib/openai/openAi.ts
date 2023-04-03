import dotenv from 'dotenv'
import { Configuration, CreateChatCompletionRequest, OpenAIApi } from 'openai'
dotenv.config()

export const openTest = async () => {
  const configuration = new Configuration({
    organization: process.env.CHAT_GPT_ORG,
    apiKey: process.env.CHAT_GPT_KEY,
  })
  const openai = new OpenAIApi(configuration)
  //const response = await openai.listEngines()
  const completion = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    max_tokens: 700,
    temperature: 1,
    top_p: 1,
    n: 1,
    stream: false,
    messages: [
      {
        role: 'system',
        content:
          '優秀な女性アシスタント。物事を段階的に考えるのが得意です。優しい口調。できないことは言わない。',
      },
      { role: 'user', content: 'お腹がすいた' },
    ],
  })
  console.log(completion.data.choices[0].message)
  return completion.data.choices[0].message
}

export const chat = async (
  createChatCompletionRequest: CreateChatCompletionRequest
) => {
  const configuration = new Configuration({
    organization: process.env.CHAT_GPT_ORG,
    apiKey: process.env.CHAT_GPT_KEY,
  })
  const openai = new OpenAIApi(configuration)
  //const response = await openai.listEngines()
  const completion = await openai.createChatCompletion(
    createChatCompletionRequest
  )
  return completion.data.choices[0].message
}

//openTest()
