const { DynamoDBClient }       = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient,
        PutCommand,
        GetCommand,
        UpdateCommand }        = require('@aws-sdk/lib-dynamodb')

// 1. Create the base client (handles auth, region, retries)
const raw    = new DynamoDBClient({ region: process.env.AWS_REGION })

// 2. Wrap with DocumentClient — plain JS objects in, plain JS objects out
const client = DynamoDBDocumentClient.from(raw)

const TABLE = process.env.DYNAMODB_TABLE

// ── save ──────────────────────────────────────────────────
// Equivalent to: db.set(code, data)
async function save(code, data) {
  await client.send(new PutCommand({
    TableName: TABLE,
    Item: { code, ...data }   // spread data fields alongside the key
  }))
}

// ── get ───────────────────────────────────────────────────
// Equivalent to: db.get(code) || null
async function get(code) {
  const { Item } = await client.send(new GetCommand({
    TableName: TABLE,
    Key: { code }
  }))
  return Item || null
}

// ── increment ─────────────────────────────────────────────
// Atomic add — safe under concurrent requests, no read needed first
async function increment(code) {
  await client.send(new UpdateCommand({
    TableName: TABLE,
    Key: { code },
    UpdateExpression:    'ADD clicks :one',
    ExpressionAttributeValues: { ':one': 1 }
  }))
}

module.exports = { save, get, increment }
