/**
 * Daily birthday-reminder job, triggered by Vercel Cron (see vercel.json).
 * Protected by CRON_SECRET so this endpoint can't be triggered by the public.
 */
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/server/supabase-admin.server";

export const Route = createFileRoute("/api/cron/birthday-reminders")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authHeader = request.headers.get("authorization");
        const cronSecret = process.env.CRON_SECRET;
        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
          return new Response("Unauthorized", { status: 401 });
        }

        const today = new Date();
        const month = today.getMonth() + 1;
        const day = today.getDate();

        // Postgres date columns are queried as text-comparable ISO strings;
        // filter month/day in JS since Supabase's query builder has no
        // native "extract month/day" filter helper.
        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("id, full_name, birthday")
          .eq("birthday_reminder_opt_in", true)
          .not("birthday", "is", null);

        const todaysBirthdays = (profiles ?? []).filter((p) => {
          if (!p.birthday) return false;
          const [, m, d] = p.birthday.split("-").map(Number);
          return m === month && d === day;
        });

        if (todaysBirthdays.length > 0) {
          await supabaseAdmin.from("notifications").insert(
            todaysBirthdays.map((p) => ({
              user_id: p.id,
              type: "system",
              title: "Happy Birthday! 🎉",
              body: "It's your special day — treat yourself (or a loved one) to something thoughtful today.",
              link: "/",
            }))
          );
        }

        return Response.json({ remindersSent: todaysBirthdays.length });
      },
    },
  },
});
