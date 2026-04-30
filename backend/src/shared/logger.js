const timestamp = () => new Date().toISOString();
const fmt = (level, msg, meta) => `[${timestamp()}] ${level.toUpperCase()} ${msg}${meta ? ' ' + JSON.stringify(meta) : ''}`;

export const logger = {
  info:  (msg, meta) => console.log(fmt('info', msg, meta)),
  warn:  (msg, meta) => console.warn(fmt('warn', msg, meta)),
  error: (msg, meta) => console.error(fmt('error', msg, meta)),
  debug: (msg, meta) => { if (process.env.NODE_ENV !== 'production') console.log(fmt('debug', msg, meta)); },
};
