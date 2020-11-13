import CryptoJS from 'crypto-js'
import tmpUtil from 'tmp'
import { gzip } from 'compressing'
import { promises as fs } from 'fs'

const secretKey = process.env.MLTD_KEY!
const secretKeyHash = CryptoJS.enc.Utf8.parse(secretKey)

const decBase = (str: string) => {
  const s = str.replace(/-/g, '+').replace(/_/g, '/')
  const b64 = CryptoJS.enc.Base64.parse(s)

  const res = CryptoJS.AES.decrypt(
    {
      ciphertext: b64,
    } as any, // bad d.ts file sucks
    secretKeyHash,
    {
      iv: CryptoJS.lib.WordArray.create(),
    }
  )

  return Buffer.from(res.toString(), 'hex').subarray(16)
}

export async function decRes(str: string) {
  const tmpFile = tmpUtil.tmpNameSync()

  await gzip.uncompress(decBase(str), tmpFile).catch(console.error)

  const json = await fs.readFile(tmpFile, 'utf-8')

  return JSON.parse(json)
}

export async function decReq(str: string) {
  const json = decBase(str).toString('utf-8')

  return JSON.parse(json)
}

export function encReq(obj: unknown) {
  let arr = CryptoJS.enc.Utf8.parse(JSON.stringify(obj))
  arr = CryptoJS.lib.WordArray.random(16).concat(arr) // 填充前16个Bytes

  const res = CryptoJS.AES.encrypt(arr, secretKeyHash, {
    iv: CryptoJS.lib.WordArray.create(),
    format: CryptoJS.format.Hex,
  }).toString()

  return Buffer.from(res, 'hex')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}
