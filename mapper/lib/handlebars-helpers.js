const moment = require('moment');

exports.dateFormat = (context, format) => {
  moment.locale('fr');
  return moment(context, moment.ISO_8601).format(format);
};

exports.truncate = (value, length) => {
  if (!value) return value;
  const start = 0;
  let end = (length > 0 ? Math.min(value.length, length) : value.length);
  let suffix = '';

  // Mettre 3 points à la fin si la chaîne a été effectivement tronquée
  if (end < value.length && end > 3) {
    end -= 3;
    suffix = '...';
  }

  return (value.substring(start, end) + suffix);
};
