#!/usr/bin/env node

const fs = require("fs")
const path = require("path")
const https = require("https")
const crypto = require("crypto")

function usage(exitCode = 0) {
  const out = exitCode === 0 ? process.stdout : process.stderr
  out.write(`Usage:
  node upload_oss.js [options] <file...>

Options:
  --prefix <prefix>          OSS object prefix, default from env/PicGo or image/
  --remote-prefix <prefix>   Prefix prepended to each uploaded basename
  --remote-name <name>       Exact object filename, only valid for one file
  --public-base-url <url>    Override public URL base
  --overwrite                Allow replacing existing OSS object
  --no-public-read           Do not set x-oss-object-acl: public-read
  --markdown                 Print Markdown image lines instead of tab-separated rows
  --json                     Print JSON result
  --dry-run                  Resolve config and object names, do not upload
  --help                     Show this help

Environment config is read before PicGo fallback. See SKILL.md for variable names.
`)
  process.exit(exitCode)
}

function parseArgs(argv) {
  const opts = {
    files: [],
    overwrite: false,
    publicRead: true,
    markdown: false,
    json: false,
    dryRun: false,
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const takeValue = () => {
      if (i + 1 >= argv.length) throw new Error(`${arg} requires a value`)
      return argv[++i]
    }
    if (arg === "--help" || arg === "-h") usage(0)
    else if (arg === "--prefix") opts.prefix = takeValue()
    else if (arg === "--remote-prefix") opts.remotePrefix = takeValue()
    else if (arg === "--remote-name") opts.remoteName = takeValue()
    else if (arg === "--public-base-url") opts.publicBaseUrl = takeValue()
    else if (arg === "--overwrite") opts.overwrite = true
    else if (arg === "--no-public-read") opts.publicRead = false
    else if (arg === "--markdown") opts.markdown = true
    else if (arg === "--json") opts.json = true
    else if (arg === "--dry-run") opts.dryRun = true
    else if (arg.startsWith("-")) throw new Error(`Unknown option: ${arg}`)
    else opts.files.push(arg)
  }
  if (opts.files.length === 0) usage(1)
  if (opts.remoteName && opts.files.length !== 1) {
    throw new Error("--remote-name is only valid when uploading one file")
  }
  return opts
}

function firstEnv(names) {
  for (const name of names) {
    const value = process.env[name]
    if (value && value.trim()) return value.trim()
  }
  return ""
}

function readPicGoConfig() {
  const configPath =
    process.env.PICGO_CONFIG_PATH ||
    path.join(process.env.HOME || "", "Library/Application Support/picgo/data.json")
  if (!configPath || !fs.existsSync(configPath)) return {}

  const data = JSON.parse(fs.readFileSync(configPath, "utf8"))
  const aliyun =
    data.picBed?.aliyun ||
    data.uploader?.aliyun?.configList?.find((item) => item._id === data.uploader?.aliyun?.defaultId) ||
    data.uploader?.aliyun?.configList?.[0] ||
    {}
  return {
    accessKeyId: aliyun.accessKeyId || "",
    accessKeySecret: aliyun.accessKeySecret || "",
    bucket: aliyun.bucket || "",
    region: aliyun.area || "",
    prefix: aliyun.path || "",
    publicBaseUrl: aliyun.customUrl || "",
  }
}

function loadConfig(opts) {
  const picgo = readPicGoConfig()
  const config = {
    accessKeyId:
      firstEnv(["ALIYUN_OSS_ACCESS_KEY_ID", "OSS_ACCESS_KEY_ID", "ALIYUN_ACCESS_KEY_ID"]) ||
      picgo.accessKeyId,
    accessKeySecret:
      firstEnv(["ALIYUN_OSS_ACCESS_KEY_SECRET", "OSS_ACCESS_KEY_SECRET", "ALIYUN_ACCESS_KEY_SECRET"]) ||
      picgo.accessKeySecret,
    bucket: firstEnv(["ALIYUN_OSS_BUCKET", "OSS_BUCKET"]) || picgo.bucket,
    region:
      firstEnv(["ALIYUN_OSS_REGION", "ALIYUN_OSS_AREA", "OSS_REGION", "OSS_AREA"]) ||
      picgo.region,
    prefix:
      opts.prefix !== undefined
        ? opts.prefix
        : firstEnv(["ALIYUN_OSS_PREFIX", "OSS_PREFIX"]) || picgo.prefix || "image/",
    publicBaseUrl:
      opts.publicBaseUrl ||
      firstEnv(["ALIYUN_OSS_PUBLIC_BASE_URL", "OSS_PUBLIC_BASE_URL"]) ||
      picgo.publicBaseUrl,
    endpoint: firstEnv(["ALIYUN_OSS_ENDPOINT", "OSS_ENDPOINT"]),
  }

  const missing = Object.entries(config)
    .filter(([key, value]) => ["accessKeyId", "accessKeySecret", "bucket", "region"].includes(key) && !value)
    .map(([key]) => key)
  if (missing.length) throw new Error(`Missing OSS config: ${missing.join(", ")}`)

  config.endpointHost = normalizeEndpoint(config)
  config.publicBaseUrl = normalizePublicBaseUrl(config)
  config.prefix = normalizePrefix(config.prefix)
  return config
}

function normalizePrefix(prefix) {
  if (!prefix) return ""
  return prefix.replace(/^\/+/, "").replace(/\/?$/, "/")
}

function normalizeEndpoint(config) {
  const endpoint = config.endpoint || `${config.bucket}.${config.region}.aliyuncs.com`
  return endpoint.replace(/^https?:\/\//, "").replace(/\/+$/, "")
}

function normalizePublicBaseUrl(config) {
  if (config.publicBaseUrl) return config.publicBaseUrl.replace(/\/+$/, "")
  return `https://${config.bucket}.${config.region}.aliyuncs.com`
}

function inferContentType(file) {
  const ext = path.extname(file).toLowerCase()
  if (ext === ".png") return "image/png"
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg"
  if (ext === ".webp") return "image/webp"
  if (ext === ".gif") return "image/gif"
  if (ext === ".svg") return "image/svg+xml"
  return "application/octet-stream"
}

function objectKeyFor(file, opts, config) {
  const name = opts.remoteName || `${opts.remotePrefix || ""}${path.basename(file)}`
  return `${config.prefix}${name}`.replace(/^\/+/, "")
}

function encodeObjectPath(key) {
  return "/" + key.split("/").map(encodeURIComponent).join("/")
}

function sign({ method, contentType, date, ossHeaders, key, config }) {
  const canonicalHeaders = Object.entries(ossHeaders)
    .map(([k, v]) => [k.toLowerCase(), String(v).trim()])
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}\n`)
    .join("")
  const canonicalResource = `/${config.bucket}/${key}`
  const stringToSign = [method, "", contentType, date].join("\n") + "\n" + canonicalHeaders + canonicalResource
  return crypto.createHmac("sha1", config.accessKeySecret).update(stringToSign, "utf8").digest("base64")
}

function ossRequest({ method, key, body, contentType, config, headers = {} }) {
  return new Promise((resolve, reject) => {
    const date = new Date().toUTCString()
    const ossHeaders = {}
    for (const [k, v] of Object.entries(headers)) {
      if (k.toLowerCase().startsWith("x-oss-")) ossHeaders[k] = v
    }
    const signature = sign({ method, contentType: contentType || "", date, ossHeaders, key, config })
    const requestHeaders = {
      Date: date,
      Authorization: `OSS ${config.accessKeyId}:${signature}`,
      ...headers,
    }
    if (contentType) requestHeaders["Content-Type"] = contentType
    if (body) requestHeaders["Content-Length"] = body.length

    const req = https.request(
      {
        method,
        host: config.endpointHost,
        path: encodeObjectPath(key),
        headers: requestHeaders,
      },
      (res) => {
        const chunks = []
        res.on("data", (chunk) => chunks.push(chunk))
        res.on("end", () =>
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          }),
        )
      },
    )
    req.on("error", reject)
    req.setTimeout(30000, () => req.destroy(new Error("OSS request timeout")))
    if (body) req.write(body)
    req.end()
  })
}

function publicHead(url) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: "HEAD" }, (res) => {
      res.resume()
      res.on("end", () => resolve({ statusCode: res.statusCode, headers: res.headers }))
    })
    req.on("error", reject)
    req.setTimeout(15000, () => req.destroy(new Error("public HEAD timeout")))
    req.end()
  })
}

function publicUrl(config, key) {
  return `${config.publicBaseUrl}/${key.split("/").map(encodeURIComponent).join("/")}`
}

function altFromFile(file) {
  return path.basename(file, path.extname(file)).replace(/[-_]+/g, " ").trim()
}

function printResults(results, opts) {
  if (opts.json) {
    console.log(JSON.stringify(results, null, 2))
    return
  }
  for (const result of results) {
    if (opts.markdown) console.log(`![${altFromFile(result.local)}](${result.url})`)
    else console.log(`${result.status}\t${result.bytes || ""}\t${result.url}`)
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  const config = loadConfig(opts)
  const results = []

  for (const file of opts.files) {
    if (!fs.existsSync(file)) throw new Error(`File not found: ${file}`)
    const key = objectKeyFor(file, opts, config)
    const url = publicUrl(config, key)

    if (opts.dryRun) {
      results.push({ local: file, key, url, status: "dry-run" })
      continue
    }

    const body = fs.readFileSync(file)
    const headers = {}
    if (!opts.overwrite) headers["x-oss-forbid-overwrite"] = "true"
    if (opts.publicRead) headers["x-oss-object-acl"] = "public-read"

    const put = await ossRequest({
      method: "PUT",
      key,
      body,
      contentType: inferContentType(file),
      config,
      headers,
    })
    if (![200, 201].includes(put.statusCode)) {
      throw new Error(`PUT failed for ${file}: HTTP ${put.statusCode}\n${put.body.slice(0, 500)}`)
    }

    const head = await publicHead(url)
    results.push({
      local: file,
      key,
      url,
      status: head.statusCode,
      bytes: head.headers["content-length"] || "",
    })
  }

  printResults(results, opts)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
