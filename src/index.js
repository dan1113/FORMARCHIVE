const TAGS = new Set(["editorial", "typography", "experimental", "identity"]);
const requestCounts = new Map();
const WINDOW_MS = 60_000;
const REQUESTS_PER_WINDOW = 20;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}

function isRateLimited(ip) {
  const now = Date.now();
  const current = requestCounts.get(ip);
  if (!current || now - current.startedAt >= WINDOW_MS) {
    requestCounts.set(ip, { startedAt: now, count: 1 });
    if (requestCounts.size > 2_000) {
      for (const [key, value] of requestCounts) {
        if (now - value.startedAt >= WINDOW_MS) requestCounts.delete(key);
      }
    }
    return false;
  }
  current.count += 1;
  return current.count > REQUESTS_PER_WINDOW;
}

function parseModelJson(text) {
  const cleaned = text.trim().replace(/^\x60{3}(?:json)?\s*/i, "").replace(/\s*\x60{3}$/i, "");
  return JSON.parse(cleaned);
}

async function search(request, env) {
  if (request.method !== "POST") return json({ error: "Use POST for search." }, 405);
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) {
    return json({ error: "Cross-origin requests are not allowed." }, 403);
  }

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (isRateLimited(ip)) return json({ error: "잠시 쉬었다가 다시 검색해 주세요." }, 429);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "검색 문장을 확인해 주세요." }, 400);
  }
  const query = typeof body?.query === "string" ? body.query.trim() : "";
  if (!query || query.length > 240) {
    return json({ error: "검색어는 1자 이상 240자 이하로 입력해 주세요." }, 400);
  }
  if (!env.GEMINI_API_KEY) {
    return json({ error: "Cloudflare Worker에 GEMINI_API_KEY secret이 설정되지 않았습니다." }, 503);
  }

  const model = env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  if (!/^[a-zA-Z0-9._-]{1,80}$/.test(model)) {
    return json({ error: "Gemini model 설정을 확인해 주세요." }, 500);
  }

  const prompt = [
    "당신은 디자인 레퍼런스 아카이브의 검색 의도 분류기입니다.",
    "사용자 설명을 아래 허용 태그 중 가장 관련 있는 1~3개로 분류하세요.",
    "허용 태그와 뜻:",
    "- editorial: 잡지, 편집 디자인, 에디토리얼 지면, 그리드",
    "- typography: 큰 활자, 타이포그래피, 글자 중심 디자인, 글자 체계",
    "- experimental: 네오 브루탈리즘, 포스트모던, 실험적·강렬한·비대칭 구성",
    "- identity: 브랜드 아이덴티티, 로고, 브랜드 시각 시스템",
    "태그는 반드시 위 네 값만 사용하세요. 프로젝트, 디자이너, URL, 출처를 새로 만들거나 추천하지 마세요.",
    "설명은 한국어 한 문장으로 짧게 작성하세요. JSON 외의 문장은 출력하지 마세요.",
    '출력 형식: {"tags":["editorial","typography"],"explanation":"잡지 지면과 활자 중심 디자인을 찾는 요청으로 해석했어요."}',
    "사용자 검색 문장: " + JSON.stringify(query)
  ].join("\n");

  let upstream;
  try {
    upstream = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" +
        encodeURIComponent(model) +
        ":generateContent",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
            maxOutputTokens: 180
          }
        }),
        signal: AbortSignal.timeout(20_000)
      }
    );
  } catch {
    return json({ error: "Gemini에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 502);
  }

  if (!upstream.ok) {
    return json({
      error: upstream.status === 429
        ? "Gemini 요청 한도에 도달했습니다. 잠시 후 다시 시도해 주세요."
        : "Gemini 검색 중 오류가 발생했습니다. Worker secret과 모델 설정을 확인해 주세요."
    }, upstream.status === 429 ? 429 : 502);
  }

  let payload;
  try {
    payload = await upstream.json();
  } catch {
    return json({ error: "Gemini 응답을 읽지 못했습니다." }, 502);
  }

  const text = payload?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();
  if (!text) return json({ error: "Gemini가 검색 해석을 반환하지 않았습니다." }, 502);

  let result;
  try {
    result = parseModelJson(text);
  } catch {
    return json({ error: "Gemini 응답 형식이 올바르지 않습니다." }, 502);
  }

  const tags = Array.isArray(result.tags)
    ? [...new Set(result.tags.filter((tag) => TAGS.has(tag)))].slice(0, 3)
    : [];
  if (!tags.length) return json({ error: "검색 문장을 디자인 태그로 분류하지 못했습니다." }, 502);

  const explanation = typeof result.explanation === "string"
    ? result.explanation.replace(/[<>]/g, "").trim().slice(0, 180)
    : "검색 의도를 디자인 태그로 정리했어요.";

  return json({ tags, explanation });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/search") return search(request, env);
    if (url.pathname.startsWith("/api/")) return json({ error: "API route not found." }, 404);
    return env.ASSETS.fetch(request);
  }
};
