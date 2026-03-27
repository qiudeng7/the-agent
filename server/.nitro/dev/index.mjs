globalThis.__nitro_main__ = import.meta.url; import { getRequestURL, defineHandler, HTTPError, H3Core, toRequest, getHeader, createError, defineEventHandler, readBody, getRouterParam, H3 } from 'file:///Users/qiudeng/workspace/the-agent/.claude/worktrees/backend-nitro/node_modules/h3/dist/_entries/node.mjs';
import { createHooks } from 'file:///Users/qiudeng/workspace/the-agent/.claude/worktrees/backend-nitro/node_modules/nitro/dist/node_modules/hookable/dist/index.mjs';
import { readFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import consola from 'file:///Users/qiudeng/workspace/the-agent/.claude/worktrees/backend-nitro/node_modules/consola/dist/index.mjs';
import { ErrorParser } from 'file:///Users/qiudeng/workspace/the-agent/.claude/worktrees/backend-nitro/node_modules/nitro/dist/node_modules/youch-core/build/index.js';
import { Youch } from 'file:///Users/qiudeng/workspace/the-agent/.claude/worktrees/backend-nitro/node_modules/nitro/dist/node_modules/youch/build/index.js';
import { SourceMapConsumer } from 'file:///Users/qiudeng/workspace/the-agent/.claude/worktrees/backend-nitro/node_modules/nitro/dist/node_modules/source-map/source-map.js';
import { FastResponse, toNodeHandler } from 'file:///Users/qiudeng/workspace/the-agent/.claude/worktrees/backend-nitro/node_modules/srvx/dist/adapters/node.mjs';
import { Server } from 'node:http';
import nodeCrypto from 'node:crypto';
import { parentPort, threadId } from 'node:worker_threads';
import { isSocketSupported, getSocketAddress } from 'file:///Users/qiudeng/workspace/the-agent/.claude/worktrees/backend-nitro/node_modules/nitro/dist/node_modules/get-port-please/dist/index.mjs';
import { eq, asc, desc } from 'file:///Users/qiudeng/workspace/the-agent/.claude/worktrees/backend-nitro/node_modules/drizzle-orm/index.js';
import { nanoid } from 'file:///Users/qiudeng/workspace/the-agent/.claude/worktrees/backend-nitro/server/node_modules/nanoid/index.js';
import bcrypt from 'file:///Users/qiudeng/workspace/the-agent/.claude/worktrees/backend-nitro/node_modules/bcrypt/bcrypt.js';
import { drizzle } from 'file:///Users/qiudeng/workspace/the-agent/.claude/worktrees/backend-nitro/node_modules/drizzle-orm/d1/index.js';
import { drizzle as drizzle$1 } from 'file:///Users/qiudeng/workspace/the-agent/.claude/worktrees/backend-nitro/node_modules/drizzle-orm/better-sqlite3/index.js';
import Database from 'file:///Users/qiudeng/workspace/the-agent/.claude/worktrees/backend-nitro/node_modules/better-sqlite3/lib/index.js';
import { promises, existsSync, mkdirSync } from 'node:fs';
import { sqliteTable, integer, text } from 'file:///Users/qiudeng/workspace/the-agent/.claude/worktrees/backend-nitro/node_modules/drizzle-orm/sqlite-core/index.js';
import * as jose from 'file:///Users/qiudeng/workspace/the-agent/.claude/worktrees/backend-nitro/node_modules/jose/dist/node/esm/index.js';
import { createStorage } from 'unstorage';
import unstorage_47drivers_47fs from 'unstorage/drivers/fs';
import { defineLazyEventHandler, toEventHandler } from 'h3';
import { decodePath, withLeadingSlash, withoutTrailingSlash, joinURL } from 'file:///Users/qiudeng/workspace/the-agent/.claude/worktrees/backend-nitro/node_modules/nitro/dist/node_modules/ufo/dist/index.mjs';
import { fileURLToPath } from 'node:url';

function defineNitroErrorHandler(handler) {
  return handler;
}

const errorHandler$0 = defineNitroErrorHandler(
  async function defaultNitroErrorHandler(error, event) {
    const res = await defaultHandler(error, event);
    return new FastResponse(
      typeof res.body === "string" ? res.body : JSON.stringify(res.body, null, 2),
      res
    );
  }
);
async function defaultHandler(error, event, opts) {
  const isSensitive = error.unhandled;
  const status = error.status || 500;
  const url = getRequestURL(event, { xForwardedHost: true, xForwardedProto: true });
  if (status === 404) {
    const baseURL = "/";
    if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) {
      const redirectTo = `${baseURL}${url.pathname.slice(1)}${url.search}`;
      return {
        status: 302,
        statusText: "Found",
        headers: { location: redirectTo },
        body: `Redirecting...`
      };
    }
  }
  await loadStackTrace(error).catch(consola.error);
  const youch = new Youch();
  if (isSensitive && !opts?.silent) {
    const tags = [error.unhandled && "[unhandled]"].filter(Boolean).join(" ");
    const ansiError = await (await youch.toANSI(error)).replaceAll(process.cwd(), ".");
    consola.error(
      `[request error] ${tags} [${event.req.method}] ${url}

`,
      ansiError
    );
  }
  const useJSON = opts?.json || !event.req.headers.get("accept")?.includes("text/html");
  const headers = {
    "content-type": useJSON ? "application/json" : "text/html",
    // Prevent browser from guessing the MIME types of resources.
    "x-content-type-options": "nosniff",
    // Prevent error page from being embedded in an iframe
    "x-frame-options": "DENY",
    // Prevent browsers from sending the Referer header
    "referrer-policy": "no-referrer",
    // Disable the execution of any js
    "content-security-policy": "script-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self';"
  };
  if (status === 404 || !event.res.headers.has("cache-control")) {
    headers["cache-control"] = "no-cache";
  }
  const body = useJSON ? {
    error: true,
    url,
    status,
    statusText: error.statusText,
    message: error.message,
    data: error.data,
    stack: error.stack?.split("\n").map((line) => line.trim())
  } : await youch.toHTML(error, {
    request: {
      url: url.href,
      method: event.req.method,
      headers: Object.fromEntries(event.req.headers.entries())
    }
  });
  return {
    status,
    statusText: error.statusText,
    headers,
    body
  };
}
async function loadStackTrace(error) {
  if (!(error instanceof Error)) {
    return;
  }
  const parsed = await new ErrorParser().defineSourceLoader(sourceLoader).parse(error);
  const stack = error.message + "\n" + parsed.frames.map((frame) => fmtFrame(frame)).join("\n");
  Object.defineProperty(error, "stack", { value: stack });
  if (error.cause) {
    await loadStackTrace(error.cause).catch(consola.error);
  }
}
async function sourceLoader(frame) {
  if (!frame.fileName || frame.fileType !== "fs" || frame.type === "native") {
    return;
  }
  if (frame.type === "app") {
    const rawSourceMap = await readFile(`${frame.fileName}.map`, "utf8").catch(() => {
    });
    if (rawSourceMap) {
      const consumer = await new SourceMapConsumer(rawSourceMap);
      const originalPosition = consumer.originalPositionFor({ line: frame.lineNumber, column: frame.columnNumber });
      if (originalPosition.source && originalPosition.line) {
        frame.fileName = resolve(dirname(frame.fileName), originalPosition.source);
        frame.lineNumber = originalPosition.line;
        frame.columnNumber = originalPosition.column || 0;
      }
    }
  }
  const contents = await readFile(frame.fileName, "utf8").catch(() => {
  });
  return contents ? { contents } : void 0;
}
function fmtFrame(frame) {
  if (frame.type === "native") {
    return frame.raw;
  }
  const src = `${frame.fileName || ""}:${frame.lineNumber}:${frame.columnNumber})`;
  return frame.functionName ? `at ${frame.functionName} (${src}` : `at ${src}`;
}

const errorHandlers = [errorHandler$0];

async function errorHandler(error, event) {
  for (const handler of errorHandlers) {
    try {
      const response = await handler(error, event, { defaultHandler });
      if (response) {
        return response;
      }
    } catch(error) {
      // Handler itself thrown, log and continue
      console.error(error);
    }
  }
  // H3 will handle fallback
}

const plugins = [
    
  ];

const serverAssets = [{"baseName":"server","dir":"/Users/qiudeng/workspace/the-agent/.claude/worktrees/backend-nitro/server/assets"}];

const assets$1 = createStorage();

for (const asset of serverAssets) {
  assets$1.mount(asset.baseName, unstorage_47drivers_47fs({ base: asset.dir, ignore: (asset?.ignore || []) }));
}

const assets = {};

function readAsset (id) {
  const serverDir = dirname(fileURLToPath(globalThis.__nitro_main__));
  return promises.readFile(resolve(serverDir, assets[id].path))
}

const publicAssetBases = {};

function isPublicAssetURL(id = '') {
  if (assets[id]) {
    return true
  }
  for (const base in publicAssetBases) {
    if (id.startsWith(base)) { return true }
  }
  return false
}

function getAsset (id) {
  return assets[id]
}

const METHODS = /* @__PURE__ */ new Set(["HEAD", "GET"]);
const EncodingMap = { gzip: ".gz", br: ".br" };
const _Bqs0Wc = defineHandler((event) => {
  if (event.req.method && !METHODS.has(event.req.method)) {
    return;
  }
  let id = decodePath(
    withLeadingSlash(withoutTrailingSlash(event.url.pathname))
  );
  let asset;
  const encodingHeader = event.req.headers.get("accept-encoding") || "";
  const encodings = [
    ...encodingHeader.split(",").map((e) => EncodingMap[e.trim()]).filter(Boolean).sort(),
    ""
  ];
  if (encodings.length > 1) {
    event.res.headers.append("Vary", "Accept-Encoding");
  }
  for (const encoding of encodings) {
    for (const _id of [id + encoding, joinURL(id, "index.html" + encoding)]) {
      const _asset = getAsset(_id);
      if (_asset) {
        asset = _asset;
        id = _id;
        break;
      }
    }
  }
  if (!asset) {
    if (isPublicAssetURL(id)) {
      event.res.headers.delete("Cache-Control");
      throw new HTTPError({ status: 404 });
    }
    return;
  }
  const ifNotMatch = event.req.headers.get("if-none-match") === asset.etag;
  if (ifNotMatch) {
    event.res.status = 304;
    event.res.statusText = "Not Modified";
    return "";
  }
  const ifModifiedSinceH = event.req.headers.get("if-modified-since");
  const mtimeDate = new Date(asset.mtime);
  if (ifModifiedSinceH && asset.mtime && new Date(ifModifiedSinceH) >= mtimeDate) {
    event.res.status = 304;
    event.res.statusText = "Not Modified";
    return "";
  }
  if (asset.type) {
    event.res.headers.set("Content-Type", asset.type);
  }
  if (asset.etag && !event.res.headers.has("ETag")) {
    event.res.headers.set("ETag", asset.etag);
  }
  if (asset.mtime && !event.res.headers.has("Last-Modified")) {
    event.res.headers.set("Last-Modified", mtimeDate.toUTCString());
  }
  if (asset.encoding && !event.res.headers.has("Content-Encoding")) {
    event.res.headers.set("Content-Encoding", asset.encoding);
  }
  if (asset.size > 0 && !event.res.headers.has("Content-Length")) {
    event.res.headers.set("Content-Length", asset.size.toString());
  }
  return readAsset(id);
});

const findRouteRules = (m,p)=>{return [];};

const _lazy_aD9S20 = defineLazyEventHandler(() => Promise.resolve().then(function () { return login_post$1; }));
const _lazy_CEQ8k1 = defineLazyEventHandler(() => Promise.resolve().then(function () { return me_get$1; }));
const _lazy_PDnhDc = defineLazyEventHandler(() => Promise.resolve().then(function () { return register_post$1; }));
const _lazy_UGn9jm = defineLazyEventHandler(() => Promise.resolve().then(function () { return _sessionId__post$1; }));
const _lazy_g3vljM = defineLazyEventHandler(() => Promise.resolve().then(function () { return _id__delete$1; }));
const _lazy_8mzOJo = defineLazyEventHandler(() => Promise.resolve().then(function () { return _id__get$1; }));
const _lazy_hbfOmw = defineLazyEventHandler(() => Promise.resolve().then(function () { return _id__put$1; }));
const _lazy_ynC30e = defineLazyEventHandler(() => Promise.resolve().then(function () { return index_get$3; }));
const _lazy_liSQyj = defineLazyEventHandler(() => Promise.resolve().then(function () { return index_post$1; }));
const _lazy_Pq4GnL = defineLazyEventHandler(() => Promise.resolve().then(function () { return index_get$1; }));
const _lazy_f6Gyld = defineLazyEventHandler(() => Promise.resolve().then(function () { return index_put$1; }));
const _lazy_Rf_QTR = defineLazyEventHandler(() => Promise.resolve().then(function () { return devTasks$1; }));

const findRoute = (m,p)=>{if(p[p.length-1]==='/')p=p.slice(0,-1)||'/';if(p==="/api/auth/login"){if(m==='POST')return {data:{route:"/api/auth/login",method:"post",handler:_lazy_aD9S20}};}if(p==="/api/auth/me"){if(m==='GET')return {data:{route:"/api/auth/me",method:"get",handler:_lazy_CEQ8k1}};}if(p==="/api/auth/register"){if(m==='POST')return {data:{route:"/api/auth/register",method:"post",handler:_lazy_PDnhDc}};}if(p==="/api/sessions"){if(m==='GET')return {data:{route:"/api/sessions",method:"get",handler:_lazy_ynC30e}};if(m==='POST')return {data:{route:"/api/sessions",method:"post",handler:_lazy_liSQyj}};}if(p==="/api/settings"){if(m==='GET')return {data:{route:"/api/settings",method:"get",handler:_lazy_Pq4GnL}};if(m==='PUT')return {data:{route:"/api/settings",method:"put",handler:_lazy_f6Gyld}};}let s=p.split('/'),l=s.length-1;if(s[1]==="api"){if(s[2]==="messages"){if(l===3||l===2){if(m==='POST')if(l>=3)return {data:{route:"/api/messages/:sessionId",method:"post",handler:_lazy_UGn9jm},params:{"sessionId":s[3],}};}}if(s[2]==="sessions"){if(l===3||l===2){if(m==='DELETE')if(l>=3)return {data:{route:"/api/sessions/:id",method:"delete",handler:_lazy_g3vljM},params:{"id":s[3],}};if(m==='GET')if(l>=3)return {data:{route:"/api/sessions/:id",method:"get",handler:_lazy_8mzOJo},params:{"id":s[3],}};if(m==='PUT')if(l>=3)return {data:{route:"/api/sessions/:id",method:"put",handler:_lazy_hbfOmw},params:{"id":s[3],}};}}}if(s[1]==="_nitro"){if(s[2]==="tasks"){return {data:{route:"/_nitro/tasks/**",handler:_lazy_Rf_QTR},params:{"_":s.slice(3).join('/'),}};}}};

const findRoutedMiddleware = (m,p)=>{return [];};

const globalMiddleware = [toEventHandler(_Bqs0Wc)];

function useNitroApp() {
  return useNitroApp.__instance__ ??= initNitroApp();
}
function initNitroApp() {
  const nitroApp = createNitroApp();
  for (const plugin of plugins) {
    try {
      plugin(nitroApp);
    } catch (error) {
      nitroApp.captureError(error, { tags: ["plugin"] });
      throw error;
    }
  }
  return nitroApp;
}
function createNitroApp() {
  const hooks = createHooks();
  const captureError = (error, errorCtx) => {
    const promise = hooks.callHookParallel("error", error, errorCtx).catch((hookError) => {
      console.error("Error while capturing another error", hookError);
    });
    if (errorCtx?.event) {
      const errors = errorCtx.event.req.context?.nitro?.errors;
      if (errors) {
        errors.push({ error, context: errorCtx });
      }
      if (typeof errorCtx.event.req.waitUntil === "function") {
        errorCtx.event.req.waitUntil(promise);
      }
    }
  };
  const h3App = createH3App(captureError);
  let fetchHandler = async (req) => {
    req.context ??= {};
    req.context.nitro = req.context.nitro || { errors: [] };
    const event = { req };
    const nitroApp = useNitroApp();
    await nitroApp.hooks.callHook("request", event).catch((error) => {
      captureError(error, { event, tags: ["request"] });
    });
    const response = await h3App.request(req, void 0, req.context);
    await nitroApp.hooks.callHook("response", response, event).catch((error) => {
      captureError(error, { event, tags: ["request", "response"] });
    });
    return response;
  };
  const requestHandler = (input, init, context) => {
    const req = toRequest(input, init);
    req.context = { ...req.context, ...context };
    return Promise.resolve(fetchHandler(req));
  };
  const originalFetch = globalThis.fetch;
  const nitroFetch = (input, init) => {
    if (typeof input === "string" && input.startsWith("/")) {
      return requestHandler(input, init);
    }
    if (input instanceof Request && "_request" in input) {
      input = input._request;
    }
    return originalFetch(input, init);
  };
  globalThis.fetch = nitroFetch;
  const app = {
    _h3: h3App,
    hooks,
    fetch: requestHandler,
    captureError
  };
  return app;
}
function createH3App(captureError) {
  const DEBUG_MODE = ["1", "true", "TRUE"].includes(true + "");
  const h3App = new H3Core({
    debug: DEBUG_MODE,
    onError: (error, event) => {
      captureError(error, { event, tags: ["request"] });
      return errorHandler(error, event);
    }
  });
  h3App._findRoute = (event) => findRoute(event.req.method, event.url.pathname);
  h3App._getMiddleware = (event, route) => {
    event.url.pathname;
    event.req.method;
    const { routeRules, routeRuleMiddleware } = getRouteRules();
    event.context.routeRules = routeRules;
    return [
      ...routeRuleMiddleware,
      ...globalMiddleware,
      ...findRoutedMiddleware().map((r) => r.data),
      ...route?.data?.middleware || []
    ].filter(Boolean);
  };
  return h3App;
}
function getRouteRules(method, pathname) {
  const m = findRouteRules();
  if (!m?.length) {
    return { routeRuleMiddleware: [] };
  }
  const routeRules = {};
  for (const layer of m) {
    for (const rule of layer.data) {
      const currentRule = routeRules[rule.name];
      if (currentRule) {
        if (rule.options === false) {
          delete routeRules[rule.name];
          continue;
        }
        if (typeof currentRule.options === "object" && typeof rule.options === "object") {
          currentRule.options = { ...currentRule.options, ...rule.options };
        } else {
          currentRule.options = rule.options;
        }
        currentRule.route = rule.route;
        currentRule.params = { ...currentRule.params, ...layer.params };
      } else if (rule.options !== false) {
        routeRules[rule.name] = { ...rule, params: layer.params };
      }
    }
  }
  const middleware = [];
  for (const rule of Object.values(routeRules)) {
    if (rule.options === false || !rule.handler) {
      continue;
    }
    middleware.push(rule.handler(rule));
  }
  return {
    routeRules,
    routeRuleMiddleware: middleware
  };
}

const scheduledTasks = false;

const tasks = {
  
};

const __runningTasks__ = {};
async function runTask(name, {
  payload = {},
  context = {}
} = {}) {
  if (__runningTasks__[name]) {
    return __runningTasks__[name];
  }
  if (!(name in tasks)) {
    throw new HTTPError({
      message: `Task \`${name}\` is not available!`,
      status: 404
    });
  }
  if (!tasks[name].resolve) {
    throw new HTTPError({
      message: `Task \`${name}\` is not implemented!`,
      status: 501
    });
  }
  const handler = await tasks[name].resolve();
  const taskEvent = { name, payload, context };
  __runningTasks__[name] = handler.run(taskEvent);
  try {
    const res = await __runningTasks__[name];
    return res;
  } finally {
    delete __runningTasks__[name];
  }
}

function _captureError(error, type) {
  console.error(`[${type}]`, error);
  useNitroApp().captureError(error, { tags: [type] });
}
function trapUnhandledNodeErrors() {
  process.on(
    "unhandledRejection",
    (error) => _captureError(error, "unhandledRejection")
  );
  process.on(
    "uncaughtException",
    (error) => _captureError(error, "uncaughtException")
  );
}

if (!globalThis.crypto) {
  globalThis.crypto = nodeCrypto;
}
trapUnhandledNodeErrors();
parentPort?.on("message", (msg) => {
  if (msg && msg.event === "shutdown") {
    shutdown();
  }
});
const nitroApp = useNitroApp();
const server = new Server(toNodeHandler(nitroApp.fetch));
let listener;
listen().catch((error) => {
  console.error("Dev worker failed to listen:", error);
  return shutdown();
});
async function listen() {
  const listenAddr = await isSocketSupported() ? getSocketAddress({
    name: `nitro-dev-${threadId}`,
    pid: true,
    random: true
  }) : { port: 0, host: "localhost" };
  return new Promise((resolve, reject) => {
    try {
      listener = server.listen(listenAddr, () => {
        const address = server.address();
        parentPort?.postMessage({
          event: "listen",
          address: typeof address === "string" ? { socketPath: address } : { host: "localhost", port: address?.port }
        });
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
}
async function shutdown() {
  server.closeAllConnections?.();
  await Promise.all([
    new Promise((resolve) => listener?.close(resolve)),
    nitroApp.hooks.callHook("close").catch(console.error)
  ]);
  parentPort?.postMessage({ event: "exit" });
}

const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  nickname: text("nickname"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
});
const chatSessions = sqliteTable("chat_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  model: text("model").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
});
const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => chatSessions.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  /** JSON: string | ContentBlock[] */
  content: text("content").notNull(),
  /** 该消息使用的模型 ID（仅 assistant 消息有） */
  model: text("model"),
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull()
});
const userSettings = sqliteTable("user_settings", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  language: text("language", { enum: ["system", "zh", "ja", "en"] }).notNull().default("system"),
  theme: text("theme", { enum: ["system", "light", "dark"] }).notNull().default("system"),
  /** JSON: CustomModelConfig[] */
  customModelConfigs: text("custom_model_configs"),
  /** JSON: string[] */
  enabledModels: text("enabled_models"),
  defaultModel: text("default_model"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
});
const schema = {
  users,
  chatSessions,
  messages,
  userSettings
};

function getDb() {
  if (globalThis.DB) {
    return drizzle(globalThis.DB, { schema });
  }
  const dbPath = join(process.cwd(), "data", "local.db");
  const dbDir = dirname(dbPath);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  return drizzle$1(sqlite, { schema });
}
const db = getDb();

const SALT_ROUNDS = 10;
async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET || "dev-secret-change-in-production";
  return new TextEncoder().encode(secret);
}
const JWT_EXPIRES_IN = "7d";
async function generateToken(payload) {
  const secret = getJwtSecret();
  return new jose.SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(JWT_EXPIRES_IN).sign(secret);
}
async function verifyToken(token) {
  const secret = getJwtSecret();
  const { payload } = await jose.jwtVerify(token, secret);
  return payload;
}
async function requireAuth(event) {
  const authHeader = getHeader(event, "Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw createError({
      statusCode: 401,
      message: "Missing or invalid Authorization header"
    });
  }
  const token = authHeader.slice(7);
  try {
    return await verifyToken(token);
  } catch (err) {
    throw createError({
      statusCode: 401,
      message: "Invalid or expired token"
    });
  }
}

const login_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  if (!body.email || !body.password) {
    throw createError({
      statusCode: 400,
      message: "Email and password are required"
    });
  }
  const result = await db.select().from(users).where(eq(users.email, body.email)).limit(1);
  const user = result[0];
  if (!user) {
    throw createError({
      statusCode: 401,
      message: "Invalid email or password"
    });
  }
  const isValid = await verifyPassword(body.password, user.passwordHash);
  if (!isValid) {
    throw createError({
      statusCode: 401,
      message: "Invalid email or password"
    });
  }
  const token = await generateToken({
    userId: user.id,
    email: user.email
  });
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      createdAt: user.createdAt.getTime()
    }
  };
});

const login_post$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: login_post
});

const me_get = defineEventHandler(async (event) => {
  const payload = await requireAuth(event);
  const result = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
  const user = result[0];
  if (!user) {
    throw createError({
      statusCode: 404,
      message: "User not found"
    });
  }
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    createdAt: user.createdAt.getTime(),
    updatedAt: user.updatedAt.getTime()
  };
});

const me_get$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: me_get
});

const register_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  if (!body.email || !body.password) {
    throw createError({
      statusCode: 400,
      message: "Email and password are required"
    });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.email)) {
    throw createError({
      statusCode: 400,
      message: "Invalid email format"
    });
  }
  if (body.password.length < 6) {
    throw createError({
      statusCode: 400,
      message: "Password must be at least 6 characters"
    });
  }
  const existing = await db.select().from(users).where(eq(users.email, body.email)).limit(1);
  if (existing.length > 0) {
    throw createError({
      statusCode: 409,
      message: "Email already registered"
    });
  }
  const now = /* @__PURE__ */ new Date();
  const userId = nanoid();
  const passwordHash = await hashPassword(body.password);
  await db.insert(users).values({
    id: userId,
    email: body.email,
    passwordHash,
    nickname: body.nickname || null,
    createdAt: now,
    updatedAt: now
  });
  const token = await generateToken({
    userId,
    email: body.email
  });
  return {
    token,
    user: {
      id: userId,
      email: body.email,
      nickname: body.nickname || null,
      createdAt: now.getTime()
    }
  };
});

const register_post$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: register_post
});

const _sessionId__post = defineEventHandler(async (event) => {
  const payload = await requireAuth(event);
  const sessionId = getRouterParam(event, "sessionId");
  if (!sessionId) {
    throw createError({
      statusCode: 400,
      message: "Session ID is required"
    });
  }
  const body = await readBody(event);
  if (!body.role || !body.content) {
    throw createError({
      statusCode: 400,
      message: "Role and content are required"
    });
  }
  if (body.role !== "user" && body.role !== "assistant") {
    throw createError({
      statusCode: 400,
      message: "Role must be user or assistant"
    });
  }
  const sessionResult = await db.select().from(chatSessions).where(eq(chatSessions.id, sessionId)).limit(1);
  const session = sessionResult[0];
  if (!session) {
    throw createError({
      statusCode: 404,
      message: "Session not found"
    });
  }
  if (session.userId !== payload.userId) {
    throw createError({
      statusCode: 403,
      message: "Access denied"
    });
  }
  const now = /* @__PURE__ */ new Date();
  const messageId = body.id || nanoid();
  const timestamp = body.timestamp ? new Date(body.timestamp) : now;
  await db.insert(messages).values({
    id: messageId,
    sessionId,
    role: body.role,
    content: JSON.stringify(body.content),
    model: body.model || null,
    timestamp
  });
  await db.update(chatSessions).set({ updatedAt: now }).where(eq(chatSessions.id, sessionId));
  if (body.role === "user") {
    const existingMessages = await db.select().from(messages).where(eq(messages.sessionId, sessionId));
    if (existingMessages.length === 1) {
      let text = "";
      if (typeof body.content === "string") {
        text = body.content;
      } else if (Array.isArray(body.content)) {
        const textBlock = body.content.find((b) => b.type === "text");
        text = textBlock?.text || "";
      }
      const title = text.slice(0, 30) + (text.length > 30 ? "..." : "");
      await db.update(chatSessions).set({ title }).where(eq(chatSessions.id, sessionId));
    }
  }
  return {
    id: messageId,
    sessionId,
    role: body.role,
    content: body.content,
    model: body.model,
    timestamp: timestamp.getTime()
  };
});

const _sessionId__post$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: _sessionId__post
});

const _id__delete = defineEventHandler(async (event) => {
  const payload = await requireAuth(event);
  const sessionId = getRouterParam(event, "id");
  if (!sessionId) {
    throw createError({
      statusCode: 400,
      message: "Session ID is required"
    });
  }
  const sessionResult = await db.select().from(chatSessions).where(eq(chatSessions.id, sessionId)).limit(1);
  const session = sessionResult[0];
  if (!session) {
    throw createError({
      statusCode: 404,
      message: "Session not found"
    });
  }
  if (session.userId !== payload.userId) {
    throw createError({
      statusCode: 403,
      message: "Access denied"
    });
  }
  await db.delete(chatSessions).where(eq(chatSessions.id, sessionId));
  return {
    success: true,
    id: sessionId
  };
});

const _id__delete$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: _id__delete
});

const _id__get = defineEventHandler(async (event) => {
  const payload = await requireAuth(event);
  const sessionId = getRouterParam(event, "id");
  if (!sessionId) {
    throw createError({
      statusCode: 400,
      message: "Session ID is required"
    });
  }
  const sessionResult = await db.select().from(chatSessions).where(eq(chatSessions.id, sessionId)).limit(1);
  const session = sessionResult[0];
  if (!session) {
    throw createError({
      statusCode: 404,
      message: "Session not found"
    });
  }
  if (session.userId !== payload.userId) {
    throw createError({
      statusCode: 403,
      message: "Access denied"
    });
  }
  const msgs = await db.select().from(messages).where(eq(messages.sessionId, sessionId)).orderBy(asc(messages.timestamp));
  return {
    session: {
      id: session.id,
      title: session.title,
      model: session.model,
      createdAt: session.createdAt.getTime(),
      updatedAt: session.updatedAt.getTime()
    },
    messages: msgs.map((m) => ({
      id: m.id,
      role: m.role,
      content: JSON.parse(m.content),
      model: m.model,
      timestamp: m.timestamp.getTime()
    }))
  };
});

const _id__get$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: _id__get
});

const _id__put = defineEventHandler(async (event) => {
  const payload = await requireAuth(event);
  const sessionId = getRouterParam(event, "id");
  if (!sessionId) {
    throw createError({
      statusCode: 400,
      message: "Session ID is required"
    });
  }
  const body = await readBody(event);
  if (!body.title) {
    throw createError({
      statusCode: 400,
      message: "Title is required"
    });
  }
  const sessionResult = await db.select().from(chatSessions).where(eq(chatSessions.id, sessionId)).limit(1);
  const session = sessionResult[0];
  if (!session) {
    throw createError({
      statusCode: 404,
      message: "Session not found"
    });
  }
  if (session.userId !== payload.userId) {
    throw createError({
      statusCode: 403,
      message: "Access denied"
    });
  }
  const now = /* @__PURE__ */ new Date();
  await db.update(chatSessions).set({
    title: body.title,
    updatedAt: now
  }).where(eq(chatSessions.id, sessionId));
  return {
    id: sessionId,
    title: body.title,
    model: session.model,
    createdAt: session.createdAt.getTime(),
    updatedAt: now.getTime()
  };
});

const _id__put$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: _id__put
});

const index_get$2 = defineEventHandler(async (event) => {
  const payload = await requireAuth(event);
  const sessions = await db.select().from(chatSessions).where(eq(chatSessions.userId, payload.userId)).orderBy(desc(chatSessions.updatedAt));
  const sessionsWithCounts = await Promise.all(
    sessions.map(async (session) => {
      const msgs = await db.select({ id: messages.id }).from(messages).where(eq(messages.sessionId, session.id));
      return {
        id: session.id,
        title: session.title,
        model: session.model,
        createdAt: session.createdAt.getTime(),
        updatedAt: session.updatedAt.getTime(),
        messageCount: msgs.length
      };
    })
  );
  return sessionsWithCounts;
});

const index_get$3 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: index_get$2
});

const index_post = defineEventHandler(async (event) => {
  const payload = await requireAuth(event);
  const body = await readBody(event);
  const now = /* @__PURE__ */ new Date();
  const sessionId = nanoid();
  await db.insert(chatSessions).values({
    id: sessionId,
    userId: payload.userId,
    title: body.title || "\u65B0\u4F1A\u8BDD",
    model: body.model || "default",
    createdAt: now,
    updatedAt: now
  });
  return {
    id: sessionId,
    title: body.title || "\u65B0\u4F1A\u8BDD",
    model: body.model || "default",
    createdAt: now.getTime(),
    updatedAt: now.getTime(),
    messageCount: 0
  };
});

const index_post$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: index_post
});

const index_get = defineEventHandler(async (event) => {
  const payload = await requireAuth(event);
  const result = await db.select().from(userSettings).where(eq(userSettings.userId, payload.userId)).limit(1);
  const settings = result[0];
  if (!settings) {
    return {
      language: "system",
      theme: "system",
      customModelConfigs: [],
      enabledModels: [],
      defaultModel: ""
    };
  }
  return {
    language: settings.language,
    theme: settings.theme,
    customModelConfigs: settings.customModelConfigs ? JSON.parse(settings.customModelConfigs) : [],
    enabledModels: settings.enabledModels ? JSON.parse(settings.enabledModels) : [],
    defaultModel: settings.defaultModel || "",
    updatedAt: settings.updatedAt.getTime()
  };
});

const index_get$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: index_get
});

const index_put = defineEventHandler(async (event) => {
  const payload = await requireAuth(event);
  const body = await readBody(event);
  const result = await db.select().from(userSettings).where(eq(userSettings.userId, payload.userId)).limit(1);
  const existing = result[0];
  const now = /* @__PURE__ */ new Date();
  if (existing) {
    await db.update(userSettings).set({
      language: body.language || existing.language,
      theme: body.theme || existing.theme,
      customModelConfigs: body.customModelConfigs ? JSON.stringify(body.customModelConfigs) : existing.customModelConfigs,
      enabledModels: body.enabledModels ? JSON.stringify(body.enabledModels) : existing.enabledModels,
      defaultModel: body.defaultModel || existing.defaultModel,
      updatedAt: now
    }).where(eq(userSettings.userId, payload.userId));
  } else {
    await db.insert(userSettings).values({
      userId: payload.userId,
      language: body.language || "system",
      theme: body.theme || "system",
      customModelConfigs: body.customModelConfigs ? JSON.stringify(body.customModelConfigs) : null,
      enabledModels: body.enabledModels ? JSON.stringify(body.enabledModels) : null,
      defaultModel: body.defaultModel || null,
      updatedAt: now
    });
  }
  return {
    language: body.language || existing?.language || "system",
    theme: body.theme || existing?.theme || "system",
    customModelConfigs: body.customModelConfigs || [],
    enabledModels: body.enabledModels || [],
    defaultModel: body.defaultModel || "",
    updatedAt: now.getTime()
  };
});

const index_put$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: index_put
});

const devTasks = new H3().get("/_nitro/tasks", async () => {
  const _tasks = await Promise.all(
    Object.entries(tasks).map(async ([name, task]) => {
      const _task = await task.resolve?.();
      return [name, { description: _task?.meta?.description }];
    })
  );
  return {
    tasks: Object.fromEntries(_tasks),
    scheduledTasks
  };
}).get("/_nitro/tasks/:name", async (event) => {
  const name = event.context.params?.name;
  const body = await event.req.json().catch(() => ({}));
  const payload = {
    ...Object.fromEntries(event.url.searchParams.entries()),
    ...body
  };
  return await runTask(name, { payload });
});

const devTasks$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: devTasks
});
//# sourceMappingURL=index.mjs.map
