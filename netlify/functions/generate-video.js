const crypto = require("crypto");

exports.handler = async (event) => {
  const reply = (statusCode, data) => ({
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(data)
  });

  if (event.httpMethod !== "POST") {
    return reply(405, {
      error: "Use POST"
    });
  }

  const secret = process.env.RUNWAYML_API_SECRET;
  const password = process.env.VIDEO_ADMIN_TOKEN;

  if (!secret || !password) {
    return reply(503, {
      error: "AI-видео ещё не настроено"
    });
  }

  const hash = value => crypto
    .createHash("sha256")
    .update(value)
    .digest();

  const token = event.headers.authorization || "";

  if (!crypto.timingSafeEqual(
    hash(token),
    hash("Bearer " + password)
  )) {
    return reply(401, {
      error: "Доступ только для администратора"
    });
  }

  try {
    const data = JSON.parse(event.body || "{}");

    const headers = {
      "Authorization": "Bearer " + secret,
      "Content-Type": "application/json",
      "X-Runway-Version": "2024-11-06"
    };

    const base = "https://api.dev.runwayml.com/v1";

    if (data.id) {
      if (!/^[a-f0-9-]{36}$/i.test(data.id)) {
        return reply(400, {error: "Invalid ID"});
      }

      const r = await fetch(
        base + "/tasks/" + data.id,
        {headers}
      );

      return reply(r.status, await r.json());
    }

    if (typeof data.image !== "string" ||
        data.image.length > 3000000 ||
        !/^data:image\/(jpeg|png|webp);base64,/.test(data.image)) {
      return reply(400, {
        error: "Загрузи небольшое фото JPG или PNG"
      });
    }

    const r = await fetch(base + "/image_to_video", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "gen4_turbo",
        promptImage: data.image,
        promptText: String(data.prompt ||
          "Natural smooth human movement, realistic face, cinematic quality"
        ).slice(0, 1000),
        ratio: "1280:720",
        duration: 5
      })
    });

    return reply(r.status, await r.json());

  } catch {
    return reply(500, {
      error: "Ошибка подключения Runway"
    });
  }
};
