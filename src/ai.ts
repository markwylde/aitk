import 'dotenv/config';

interface Message {
  role: string;
  content: string;
}

interface QueryOptions {
  model: string;
  messages: Message[];
  stream?: boolean;
}

interface Choice {
  message: {
    content: string;
  };
}

interface QueryResponse {
  choices: Choice[];
}

interface StreamChoice {
  delta: {
    content: string;
  };
  finish_reason: string | null;
}

interface StreamResponse {
  choices: StreamChoice[];
}

interface Model {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

interface ModelsResponse {
  data: Model[];
  object: string;
}

export async function queryModel(options: QueryOptions): Promise<string> {
  const response = await fetch(`${process.env.LITELLM_API_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.LITELLM_AUTH_TOKEN}`,
    },
    body: JSON.stringify({ ...options, stream: options.stream || false }),
  });

  if (!response.ok) {
    const data = await response.text();
    console.log(data);
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  if (options.stream) {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonData = line.slice(6);
          if (jsonData === '[DONE]') {
            return fullContent;
          }
          try {
            const parsedData: StreamResponse = JSON.parse(jsonData);
            const content = parsedData.choices[0]?.delta?.content || '';
            process.stdout.write(content);
            fullContent += content;
          } catch (error) {
            console.error('Error parsing JSON:', error);
          }
        }
      }
    }

    return fullContent;
  } else {
    const data: QueryResponse = await response.json();
    const content = data.choices[0].message.content;
    return content;
  }
}

export async function listModels(): Promise<ModelsResponse> {
  const response = await fetch(`${process.env.LITELLM_API_URL}/v1/models`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.LITELLM_AUTH_TOKEN}`,
    }
  });

  if (!response.ok) {
    const data = await response.text();
    console.log(data);
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: ModelsResponse = await response.json();
  return data;
}
