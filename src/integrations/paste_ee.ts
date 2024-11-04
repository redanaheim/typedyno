interface Paste {
  id: string;
}

export const PASTE_API_TOKEN = process.env.PASTE_API_TOKEN;

export const url = function (paste: Paste): string {
  return "https://paste.ee/r/" + paste.id;
}

export const create_paste = async function (
    text: string
  ): Promise<Paste> {
    let paste = require("paste.ee") as (
      data: string,
      token: string
    ) => Promise<{ id: string }>;
    let posted = await paste(text, PASTE_API_TOKEN);
    
    return posted;
  };
  