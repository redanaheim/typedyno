// DO NOT USE
// This was intended to add .js file extensions to the end of TypeScript import statements.
/*
import { readFile, writeFile, readdir, stat } from "fs/promises";
import * as path from "path";

const walk = async function(dir) {
    return new Promise((res, rej) => {
        let results = [];
        readdir(dir).then((list, err) => {
          if (err) rej(err);
          var pending = list.length;
          if (pending === 0) res(results);
          list.forEach(function(file) {
            file = path.resolve(dir, file);
            stat(file).then((stat, _err) => {
              if (stat && stat.isDirectory()) {
                walk(file).then((more_files) => {
                  results = results.concat(more_files);
                  if (pending === 1) res(results);
                  else pending--;
                });
              } else {
                results.push(file);
                if (pending === 1) res(results);
                else pending--;
              }
            });
          });
        });
    });
};

const out_files = (await walk("./out/")).filter(name => name.endsWith(".js"));
console.log({out_files})
let import_regex = /import \{(?<import_contents>(?:[^;]|\n)*)\} from "\.(?<extra>\.?)\/(?<import_path>.+)"\;/mg

for (const file of out_files) {
    console.log(`Found file ${file}`)
    const content = await readFile(file, "utf-8");

    if (import_regex.test(content)) {
        import_regex.lastIndex = 0;
        console.log(`${file} has match for import regex...`)
        let res = content;

        const matches = [...content.matchAll(import_regex)];

        for (const match_group of matches) {
            console.log(`Replacing ${match_group[0].split("\n").join("")} with`)
            console.log(`import {${match_group.groups.import_contents}} from ".${match_group.groups.extra}/${match_group.groups.import_path}.js";`)
            res = res.replace(match_group[0], `import {${match_group.groups.import_contents}} from ".${match_group.groups.extra}/${match_group.groups.import_path}.js";`)
        }

        await writeFile(file, res);
    }
}
*/