import { request } from "https";

export const create = async function (text: string, auth_key: string, title?: string): Promise<{ id: string }> {
    const options = {
        hostname: "api.paste.ee",
        path: "/v1/pastes",
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Auth-Token": auth_key,
        },
    };
    /*var req = https.request(options, (res) => {
  
      res.on('data', (d) => {
        if (JSON.parse(d)["id"]) {
          return d;
        }
      });
    })*/

    return new Promise(function (resolve, reject) {
        var req = request(options, res => {
            let data = "";
            res.on("data", d => {
                if (typeof d === "string") {
                    data += d;
                } else if ((d as object) instanceof Buffer) {
                    data += (d as Buffer).toString("utf-8");
                }
            });

            res.on("close", () => {
                const parsed = JSON.parse(data);
                if ("id" in parsed) {
                    resolve(parsed);
                }
            });
        });

        req.on("error", e => {
            reject(e);
            console.error(e);
        });

        if (title) {
            req.write(
                JSON.stringify({
                    description: "test",
                    sections: [
                        {
                            name: title,
                            syntax: "autodetect",
                            contents: text,
                        },
                    ],
                }),
            );
        } else {
            req.write(
                JSON.stringify({
                    description: "no-desc",
                    sections: [
                        {
                            syntax: "autodetect",
                            contents: text,
                        },
                    ],
                }),
            );
        }
        req.end();
    });
};
