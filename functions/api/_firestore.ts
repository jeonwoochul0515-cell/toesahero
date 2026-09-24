// 서버(Cloudflare Pages Function)에서 Firestore에 안전하게 쓰기 위한 서비스계정 REST 헬퍼.
// 보안규칙상 paymentStatus 등은 어드민만 쓸 수 있으므로, 결제 결과 반영은 서비스계정으로 일원화한다.
// 서비스계정 키(FIREBASE_SERVICE_ACCOUNT)는 CF Pages 서버 env에만 둔다. 클라이언트 노출 금지.
//
// 참고: 서비스계정 REST는 IAM 권한으로 동작하므로 Firestore 보안규칙을 우회한다.
//       따라서 firestore.rules 의 orders 컬렉션은 클라이언트 write=false 로 두어도 서버는 정상 동작.

export interface FirestoreEnv {
  FIREBASE_SERVICE_ACCOUNT?: string; // 서비스계정 JSON 전체 (문자열)
  FIREBASE_PROJECT_ID?: string; // 미지정 시 서비스계정의 project_id 사용
}

type ServiceAccount = {
  client_email: string;
  private_key: string;
  project_id: string;
};

// Firestore REST 의 타입 값. 우리가 쓰는 타입만 지원.
type FsValue =
  | { stringValue: string }
  | { integerValue: string }
  | { booleanValue: boolean }
  | { timestampValue: string }
  | { nullValue: null };

export type Fields = Record<string, string | number | boolean | null | { __timestamp: string }>;

function parseServiceAccount(env: FirestoreEnv): ServiceAccount {
  if (!env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT 미설정");
  }
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT) as ServiceAccount;
  if (!sa.client_email || !sa.private_key) {
    throw new Error("서비스계정 JSON 형식 오류");
  }
  return sa;
}

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToDer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const bin = atob(body);
  const der = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) der[i] = bin.charCodeAt(i);
  return der.buffer;
}

// 서비스계정으로 OAuth2 액세스 토큰 발급 (RS256 JWT bearer).
async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const enc = new TextEncoder();
  const signingInput =
    b64url(enc.encode(JSON.stringify(header))) +
    "." +
    b64url(enc.encode(JSON.stringify(claims)));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    enc.encode(signingInput)
  );
  const jwt = signingInput + "." + b64url(sig);

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!resp.ok) {
    throw new Error(`토큰 발급 실패: ${resp.status} ${await resp.text()}`);
  }
  const data = (await resp.json()) as { access_token: string };
  return data.access_token;
}

function encodeFields(fields: Fields): Record<string, FsValue> {
  const out: Record<string, FsValue> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === null) out[k] = { nullValue: null };
    else if (typeof v === "string") out[k] = { stringValue: v };
    else if (typeof v === "boolean") out[k] = { booleanValue: v };
    else if (typeof v === "number")
      out[k] = { integerValue: String(Math.trunc(v)) };
    else if (typeof v === "object" && "__timestamp" in v)
      out[k] = { timestampValue: v.__timestamp };
  }
  return out;
}

function decodeValue(v: FsValue): unknown {
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("booleanValue" in v) return v.booleanValue;
  if ("timestampValue" in v) return v.timestampValue;
  return null;
}

function projectId(env: FirestoreEnv, sa: ServiceAccount): string {
  return env.FIREBASE_PROJECT_ID || sa.project_id;
}

function baseUrl(pid: string): string {
  return `https://firestore.googleapis.com/v1/projects/${pid}/databases/(default)/documents`;
}

export function nowTimestamp(): { __timestamp: string } {
  return { __timestamp: new Date().toISOString() };
}

// 문서 1건 읽기. 없으면 null.
export async function getDoc(
  env: FirestoreEnv,
  path: string
): Promise<Record<string, unknown> | null> {
  const sa = parseServiceAccount(env);
  const token = await getAccessToken(sa);
  const resp = await fetch(`${baseUrl(projectId(env, sa))}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (resp.status === 404) return null;
  if (!resp.ok) throw new Error(`getDoc 실패: ${resp.status} ${await resp.text()}`);
  const data = (await resp.json()) as { fields?: Record<string, FsValue> };
  if (!data.fields) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data.fields)) out[k] = decodeValue(v);
  return out;
}

// 컬렉션에 지정 ID로 문서 생성.
export async function createDoc(
  env: FirestoreEnv,
  collection: string,
  docId: string,
  fields: Fields
): Promise<void> {
  const sa = parseServiceAccount(env);
  const token = await getAccessToken(sa);
  const url = `${baseUrl(projectId(env, sa))}/${collection}?documentId=${encodeURIComponent(docId)}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ fields: encodeFields(fields) }),
  });
  if (!resp.ok) throw new Error(`createDoc 실패: ${resp.status} ${await resp.text()}`);
}

// ── 어드민 조회용(헤드리스 어드민 API) — 한 요청 안에서 토큰 1개로 여러 번 읽는다 ──
// 위 getDoc 은 결제 경로가 쓰므로 건드리지 않는다. 여기는 map·array·double 까지 풀어 읽는다.
type DeepValue = Record<string, unknown>;

export function decodeDeep(v: DeepValue): unknown {
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("booleanValue" in v) return v.booleanValue;
  if ("timestampValue" in v) return v.timestampValue;
  if ("mapValue" in v) {
    const f = ((v.mapValue as { fields?: Record<string, DeepValue> }) ?? {}).fields ?? {};
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(f)) out[k] = decodeDeep(x);
    return out;
  }
  if ("arrayValue" in v) {
    const vals = ((v.arrayValue as { values?: DeepValue[] }) ?? {}).values ?? [];
    return vals.map(decodeDeep);
  }
  return null;
}

export type FsRow = { id: string; data: Record<string, unknown> };

function toRow(doc: { name: string; fields?: Record<string, DeepValue> }): FsRow {
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(doc.fields ?? {})) data[k] = decodeDeep(v);
  return { id: doc.name.slice(doc.name.lastIndexOf("/") + 1), data };
}

export type FsClient = {
  get(path: string): Promise<FsRow | null>;
  /** 단일 등가 조건(선택) + 정렬(선택) 조회. 복합 색인이 필요 없는 조합만 쓴다. */
  query(
    collectionId: string,
    opts: { eq?: [string, string]; orderDesc?: string; limit: number }
  ): Promise<FsRow[]>;
};

export async function fsClient(env: FirestoreEnv): Promise<FsClient> {
  const sa = parseServiceAccount(env);
  const token = await getAccessToken(sa);
  const base = baseUrl(projectId(env, sa));
  const auth = { Authorization: `Bearer ${token}` };
  return {
    async get(path) {
      const resp = await fetch(`${base}/${path}`, { headers: auth });
      if (resp.status === 404) return null;
      if (!resp.ok) throw new Error(`get 실패: ${resp.status}`);
      return toRow((await resp.json()) as { name: string; fields?: Record<string, DeepValue> });
    },
    async query(collectionId, opts) {
      const structuredQuery: Record<string, unknown> = {
        from: [{ collectionId }],
        limit: opts.limit,
      };
      if (opts.eq) {
        structuredQuery.where = {
          fieldFilter: {
            field: { fieldPath: opts.eq[0] },
            op: "EQUAL",
            value: { stringValue: opts.eq[1] },
          },
        };
      }
      if (opts.orderDesc) {
        structuredQuery.orderBy = [{ field: { fieldPath: opts.orderDesc }, direction: "DESCENDING" }];
      }
      const resp = await fetch(`${base}:runQuery`, {
        method: "POST",
        headers: { ...auth, "content-type": "application/json" },
        body: JSON.stringify({ structuredQuery }),
      });
      if (!resp.ok) throw new Error(`query 실패: ${resp.status}`);
      const rows = (await resp.json()) as Array<{ document?: { name: string; fields?: Record<string, DeepValue> } }>;
      return rows.filter((r) => r.document).map((r) => toRow(r.document!));
    },
  };
}

// 문서 일부 필드만 갱신(updateMask). 지정한 필드만 덮어쓴다.
export async function patchDoc(
  env: FirestoreEnv,
  path: string,
  fields: Fields
): Promise<void> {
  const sa = parseServiceAccount(env);
  const token = await getAccessToken(sa);
  const mask = Object.keys(fields)
    .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
    .join("&");
  const url = `${baseUrl(projectId(env, sa))}/${path}?${mask}`;
  const resp = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ fields: encodeFields(fields) }),
  });
  if (!resp.ok) throw new Error(`patchDoc 실패: ${resp.status} ${await resp.text()}`);
}
