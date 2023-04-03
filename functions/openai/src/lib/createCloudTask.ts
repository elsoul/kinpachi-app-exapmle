import encodeBase64 from '@/utils/base64'
import { v2 } from '@google-cloud/tasks'
import dotenv from 'dotenv'

type CloudTaskParams<T = string | number | boolean> = { [key: string]: T }

dotenv.config()
const { CloudTasksClient } = v2
const project = process.env.GCLOUD_PROJECT || ''
const location = process.env.GCP_TASKS_LOCATION || ''
const serviceAccountEmail = `${project}@${project}.iam.gserviceaccount.com`

const createCloudTask = async (
  workerEndpoint: string,
  queue: string,
  params: CloudTaskParams,
  inSeconds?: number
) => {
  const body = await encodeBase64(JSON.stringify(params))
  const client = new CloudTasksClient()
  await createTask(body, client, workerEndpoint, queue, inSeconds)
}

const createTask = async (
  body: string,
  client: v2.CloudTasksClient,
  workerEndpoint: string,
  queue: string,
  inSeconds: number | undefined
) => {
  const parent = client.queuePath(project, location, queue)
  const task = {
    httpRequest: {
      headers: {
        'Content-Type': 'application/json',
      },
      httpMethod: 'POST',
      url: workerEndpoint,
      oidcToken: {
        serviceAccountEmail,
      },
      body,
    },
    scheduleTime: {},
  }

  if (inSeconds) {
    // The time when the task is scheduled to be attempted.
    task.scheduleTime = {
      seconds: parseInt(String(inSeconds)) + Date.now() / 1000,
    }
  }

  console.log(`Sending task: ${queue}`)

  // Send create task request.
  const request = { parent: parent, task: task }
  //@ts-ignore
  const [response] = await client.createTask(request)
  const name = response.name
  console.log(`Created task ${name}`)
}

export default createCloudTask
