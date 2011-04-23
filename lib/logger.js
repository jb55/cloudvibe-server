var winston = require('winston'); // logging

var loggingLevels = {
  levels: {
    debug: 5,
    query: 6,
    info: 10,
    notice: 20,
    warn: 30,
    error: 40,
    crit: 50,
    alert: 60,
    emerg: 70
  },
  colors: {
    debug: 'blue',
    query: 'blue',
    info: 'green',
    notice: 'yellow',
    warn: 'red',
    error: 'red',
    crit: 'red',
    alert: 'yellow',
    emerg: 'red'
  }
};

var logger = exports.logger = new winston.Logger({
  transports: [
    new winston.transports.Console({colorize: true, level: 'debug'})
  ],
  levels: loggingLevels.levels,
  level: 'debug'
});

winston.addColors(loggingLevels.colors);

logger.extend(exports);
