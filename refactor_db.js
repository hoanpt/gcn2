const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.js')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk(path.join(process.cwd(), 'app', 'api')).concat([path.join(process.cwd(), 'lib', 'backup.js'), path.join(process.cwd(), 'lib', 'db.js')]);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace getDb() with await getDb()
  content = content.replace(/const db = getDb\(\);/g, 'const db = await getDb();');

  // Replace db.prepare(...).get(...)
  content = content.replace(/db\.prepare\((.*?)\)\.get\((.*?)\)/gs, (match, p1, p2) => {
    return p2.trim() ? `await db.get(${p1}, ${p2})` : `await db.get(${p1})`;
  });

  // Replace db.prepare(...).all(...)
  content = content.replace(/db\.prepare\((.*?)\)\.all\((.*?)\)/gs, (match, p1, p2) => {
    return p2.trim() ? `await db.all(${p1}, ${p2})` : `await db.all(${p1})`;
  });

  // Replace db.prepare(...).run(...)
  content = content.replace(/db\.prepare\((.*?)\)\.run\((.*?)\)/gs, (match, p1, p2) => {
    return p2.trim() ? `await db.run(${p1}, ${p2})` : `await db.run(${p1})`;
  });

  // Fix db.exec
  content = content.replace(/db\.exec\((.*?)\)/gs, (match, p1) => {
    return `await db.exec(${p1})`;
  });

  if (content !== original) {
    console.log('Updated:', file);
    fs.writeFileSync(file, content);
  }
});
