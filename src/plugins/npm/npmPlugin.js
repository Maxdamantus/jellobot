const { messageToFactoid } = require('../factoids/factoidsPlugin');
const exec = require('../../utils/exec');

const getDesc = (description, maxLen = 100) =>
  description
    ? `${description.slice(0, maxLen)}${description.length > maxLen ? '…' : ''}`
    : '(no description)';

module.exports = async function npmPlugin(msg) {
  if (!msg.command) return;

  const [cmd, name] = msg.command.command.split(' ');
  if (cmd !== 'npm' || !name) {
    return;
  }
  const factoid = await messageToFactoid(msg);
  if (factoid) {
    return;
  }

  msg.handling();

  if (!/^[a-zA-Z0-9_.@/~-]{3,}$/.test(name)) {
    msg.respondWithMention(`that doesn't look like a valid package name`);
    return;
  }

  if (name.startsWith('~')) {
    try {
      const stdout = await exec('npm', ['search', name.slice(1), '--json']);
      const data = JSON.parse(stdout);

      msg.respondWithMention(
        data
          .slice(0, 5)
          .map((p) =>
            [
              `npm.im/${p.name}`, // we could put the source link rather, using https://api.npms.io/v2/package/${p.name}
              p.version,
              p.date && p.date.slice(0, 10),
              getDesc(p.description, 80),
            ]
              .join('|')
              .replace('|', ' '),
          )
          .join(' ⸺ '),
      );
    } catch (e) {
      msg.respondWithMention('Failed to look up packages');
    }
  } else {
    try {
      const stdout = await exec('npm', ['info', name, '--json']);
      const data = JSON.parse(stdout);
      const version = data['dist-tags'] && data['dist-tags'].latest; // data.version is not necessarily published yet

      msg.respondWithMention(
        [
          `npm.im/${name}`,
          version,
          ((data['dist-tags'] && data.time[version]) || '').slice(0, 10),
          getDesc(data.description),
        ]
          .join('|')
          .replace('|', ' '),
      );
    } catch (err) {
      msg.respondWithMention('Failed to look up package');
    }
  }
};
