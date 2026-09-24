// 접수함 /api/admin/chats — 히로 대화(전달 동의한 것만 저장됨) 목록. 사무실이 답하는 실시간 창구는 없어 live 는 늘 false.
import { fsClient } from "../_firestore";
import { checkAdmin, json, masked, SID_RE, str, upstreamError, utc, type AdminApiEnv } from "../_adminApi";

type Sess = { sid: string; name: string; live: boolean; last_at: string; started_at: string; last_msg: string; n: number };

export const onRequestGet: PagesFunction<AdminApiEnv> = async ({ request, env }) => {
  const denied = await checkAdmin(request, env);
  if (denied) return denied;
  try {
    const fs = await fsClient(env);
    const [msgs, cases] = await Promise.all([
      fs.query("chat_messages", { orderDesc: "createdAt", limit: 500 }),
      fs.query("consultations", { orderDesc: "createdAt", limit: 300 }),
    ]);
    const names = new Map<string, string>();
    for (const c of cases) {
      const sid = str(c.data.sessionId, 64);
      const name = str(c.data.userName, 40).trim();
      if (sid && name && !names.has(sid)) names.set(sid, name);
    }
    const map = new Map<string, Sess>();
    for (const m of msgs) {
      const sid = str(m.data.sessionId, 64);
      if (!SID_RE.test(sid)) continue;
      const at = utc(m.data.createdAt);
      let s = map.get(sid);
      if (!s) {
        s = { sid, name: names.get(sid) ?? "", live: false, last_at: "", started_at: at, last_msg: "", n: 0 };
        map.set(sid, s);
      }
      s.n += 1;
      if (at >= s.last_at) {
        s.last_at = at;
        s.last_msg = masked(m.data.text, 120);
      }
      if (at && (!s.started_at || at < s.started_at)) s.started_at = at;
    }
    const sessions = [...map.values()].sort((a, b) => b.last_at.localeCompare(a.last_at));
    return json({ sessions });
  } catch (e) {
    return upstreamError("chats", e);
  }
};
