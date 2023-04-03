import { auth } from 'firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import dotenv from 'dotenv'
import { Request } from 'firebase-functions/v2/https'
import {
  ChatCompletionRequestMessage,
  CreateChatCompletionRequest,
} from 'openai'

dotenv.config()

export const addUser = async (
  db: FirebaseFirestore.Firestore,
  uid: string,
  username: string,
  email: string,
  iconUrl: string
) => {
  try {
    const docRef = db.collection('users').doc(uid)
    const timestamp = FieldValue.serverTimestamp()
    await docRef.set({
      uid,
      username,
      email,
      iconUrl,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    return docRef.id
  } catch (error) {
    throw new Error(`addUser: ${error}`)
  }
}

export const usersCollection = (db: FirebaseFirestore.Firestore) =>
  db.collection('users')
export const chatRoomsCollection = async (
  userId: string,
  db: FirebaseFirestore.Firestore
) => {
  try {
    return usersCollection(db).doc(userId).collection('chatRooms')
  } catch (error) {
    throw new Error(`chatRoomsCollection: ${error}`)
  }
}

export const messagesCollection = async (
  userId: string,
  chatRoomId: string,
  db: FirebaseFirestore.Firestore
) => {
  try {
    const chatRoom = await chatRoomsCollection(userId, db)
    return chatRoom.doc(chatRoomId).collection('messages')
  } catch (error) {
    throw new Error(`messagesCollection: ${error}`)
  }
}

export const addChatRoom = async (
  userId: string,
  model: string,
  maxTokens: number,
  temperature: number,
  db: FirebaseFirestore.Firestore
) => {
  try {
    const chatRoom = await chatRoomsCollection(userId, db)
    const docRef = chatRoom.doc()
    const timestamp = FieldValue.serverTimestamp()
    await docRef.set({
      userId,
      model,
      maxTokens,
      temperature,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    return docRef.id
  } catch (error) {
    throw new Error(`addChatRoom: ${error}`)
  }
}

export const addMessage = async (
  userId: string,
  chatRoomId: string,
  role = 'user',
  content: string,
  db: FirebaseFirestore.Firestore
) => {
  try {
    const message = await messagesCollection(userId, chatRoomId, db)
    const docRef = message.doc()
    const timestamp = FieldValue.serverTimestamp()
    await docRef.set({
      role,
      content,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    return docRef.id
  } catch (error) {
    throw new Error(`addMessage: ${error}`)
  }
}

export const getUser = async (req: Request) => {
  try {
    const token = req.headers.authorization
    if (token == 'undefined' || token == null) throw new Error('Invalid token!')
    const bearer = token.split('Bearer ')[1]
    return await auth().verifyIdToken(bearer)
  } catch (error) {
    throw new Error(`getUser: ${error}`)
  }
}

export const getRoomMessages: (
  userId: string,
  chatRoomId: string,
  db: FirebaseFirestore.Firestore
) => Promise<CreateChatCompletionRequest> = async (
  userId: string,
  chatRoomId: string,
  db: FirebaseFirestore.Firestore
) => {
  try {
    const chatRoomSnapshot = await chatRoomsCollection(userId, db)

    const data = await chatRoomSnapshot.doc(chatRoomId).get()
    console.log(data.data())
    const chatRoomData = data.data()

    const messagesSnapshot = await messagesCollection(userId, chatRoomId, db)
    const messageCol = await messagesSnapshot.orderBy('createdAt').get()
    if (!chatRoomData) throw new Error('no data!')

    const messagesData: Array<ChatCompletionRequestMessage> =
      messageCol.docs.map((doc) => {
        const { createdAt, updatedAt, ...message } = doc.data()
        if (!message) throw new Error('no message!')
        return message as ChatCompletionRequestMessage
      })

    const chatRoomWithMessages = {
      model: chatRoomData.model,
      max_tokens: chatRoomData.maxTokens,
      temperature: chatRoomData.temperature,
      top_p: 1,
      n: 1,
      stream: false,
      messages: messagesData,
    }

    return chatRoomWithMessages
  } catch (error) {
    throw new Error(`getRoomMessages: ${error}`)
  }
}
