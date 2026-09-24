// 접수함 /api/admin/chat/send — 퇴사히어로에는 사무실이 방문자 화면에 답하는 실시간 창구가 없다. 501로 분명히 알린다.
import { checkAdmin, json, type AdminApiEnv } from "../../_adminApi";

export const onRequestPost: PagesFunction<AdminApiEnv> = async ({ request, env }) => {
  const denied = await checkAdmin(request, env);
  if (denied) return denied;
  return json(
    {
      ok: false,
      error: "not_supported",
      message: "퇴사히어로는 실시간 답장 창구가 없습니다. 손님에게 전화나 문자로 연락해 주세요.",
    },
    501
  );
};
