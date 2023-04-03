import admin from 'firebase-admin'
import dotenv from 'dotenv'
import { onRequest } from 'firebase-functions/v2/https'
import {
  addChatRoom,
  addMessage,
  getRoomMessages,
  getUser,
} from '@/lib/firestore'
import { chat } from '@/lib/openai/openAi'
import { getFirestore } from 'firebase-admin/firestore'

dotenv.config()
const project = process.env.GCLOUD_PROJECT || ''
const serviceAccount = `${project}@${project}.iam.gserviceaccount.com`
const vpcConnector = `${project}-con`
const cors = ['http://localhost:4000', 'https://app.kinpach.app']
admin.initializeApp()
const db = getFirestore()

export const hello = onRequest(
  {
    region: 'asia-northeast1',
    cpu: 1,
    memory: '4GiB',
    maxInstances: 100,
    minInstances: 0,
    concurrency: 1,
    serviceAccount,
    ingressSettings: 'ALLOW_INTERNAL_AND_GCLB',
    vpcConnector,
    vpcConnectorEgressSettings: 'PRIVATE_RANGES_ONLY',
    cors,
  },
  async (req, res) => {
    try {
      const message = await req.body.message
      res.json({
        env: process.env.NODE_ENV,
        result: 'Running Kinpachi APP!',
        message,
      })
    } catch (error) {
      const errorLog = `openaichatroom2: ${error}`
      console.log(errorLog)
      res.status(400).json({ result: `openaichatroom2 ${error}` })
    }
  }
)

export const openaichatroom = onRequest(
  {
    region: 'asia-northeast1',
    cpu: 1,
    memory: '4GiB',
    maxInstances: 100,
    minInstances: 0,
    concurrency: 1,
    serviceAccount,
    ingressSettings: 'ALLOW_INTERNAL_AND_GCLB',
    vpcConnector,
    vpcConnectorEgressSettings: 'PRIVATE_RANGES_ONLY',
    cors,
  },
  async (req, res) => {
    try {
      const body = {
        model: req.body.model || 'gpt-3.5-turbo',
        systemCharacter:
          req.body.systemCharacter ||
          '優秀な女性アシスタント。物事を段階的に考えるのが得意です。優しい口調。できないことは言わない。',
        chatRoomId: String(req.body.chatRoomId) || '',
        content: req.body.content,
        maxTokens: req.body.maxTokens || 700,
        temperature: req.body.temperature || 1,
      }
      const user = await getUser(req)
      if (body.chatRoomId == '') {
        const chatRoomId = await addChatRoom(
          user.uid,
          body.model,
          body.maxTokens,
          body.temperature,
          db
        )
        await addMessage(
          user.uid,
          chatRoomId,
          'system',
          body.systemCharacter,
          db
        )
      }

      const role = 'user'
      await addMessage(user.uid, body.chatRoomId, role, body.content, db)
      const openaiBody = await getRoomMessages(user.uid, body.chatRoomId, db)
      const message = await chat(openaiBody)
      if (!message) throw new Error('message is undefined')
      await addMessage(
        user.uid,
        body.chatRoomId,
        message.role,
        message.content,
        db
      )

      res.json({ result: 'success!', message })
    } catch (error) {
      const errorLog = `openaichatroom - ${error}`
      console.log(errorLog)
      res.status(400).json({ result: 'openaichatroom error!' })
    }
  }
)
