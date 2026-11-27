import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};
const reply = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return reply(null, 405);
  let input: { token?: unknown; openLetter?: unknown; pin?: unknown } | null;
  try {
    input = await request.json();
  } catch {
    return reply(null, 400);
  }
  const token = input?.token;
  if (typeof token !== "string" || !/^[-_a-zA-Z0-9]{43}$/.test(token))
    return reply(null);
  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data, error } = await db.rpc("read_gift", {
    gift_token: token,
    access_pin:
      typeof input?.pin === "string" && input.pin.length <= 12
        ? input.pin
        : null,
  });
  if (error) return reply({ message: "Could not load this gift." }, 500);
  if (!data || data.pinRequired) return reply(data);
  if (input?.openLetter !== true) {
    const {
      flowers,
      wrap,
      fold,
      ribbon,
      arrangement,
      recipient,
      sender,
      noteMode,
      bouquetNote,
    } = data.gift;
    return reply({
      gift: {
        flowers,
        wrap,
        fold,
        ribbon,
        arrangement,
        recipient,
        sender,
        noteMode,
        bouquetNote,
      },
      photo: "",
    });
  }
  if (data.photo) {
    const { data: signed, error: photoError } = await db.storage
      .from("letter-photos")
      .createSignedUrl(data.photo, 120);
    data.photo = signed?.signedUrl || "";
    data.photoUnavailable = Boolean(photoError);
  }
  return reply(data);
});
