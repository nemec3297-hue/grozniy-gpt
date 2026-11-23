
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Используй POST" })
    };
  }

  const key = process.env.OPENAI_API_KEY;

  if (!key) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "OPENAI_API_KEY не настроен"
      })
    };
  }

  try {
    const { prompt, size = "1024x1024" } =
      JSON.parse(event.body || "{}");

    if (!prompt || typeof prompt !== "string") {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Введите описание изображения"
        })
      };
    }

    const allowedSizes = [
      "1024x1024",
      "1536x1024",
      "1024x1536"
    ];

    if (!allowedSizes.includes(size)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Неподдерживаемый формат"
        })
      };
    }

    const response = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-image-1",
          prompt: prompt.slice(0, 2000),
          size
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error?.message || "Ошибка OpenAI API"
      );
    }

    if (!data.data?.[0]?.b64_json) {
      throw new Error("Изображение не получено");
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        image: data.data[0].b64_json
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message
      })
    };
  }
};
