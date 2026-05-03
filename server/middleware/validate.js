/**
 * Lightweight input validation middleware factory.
 * Usage: router.post('/', validate(schema), handler)
 *
 * schema: { fieldName: { required, type, min, max, enum, minLength, maxLength } }
 */
function validate(schema) {
  return (req, res, next) => {
    const errors = [];
    const body = req.body || {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = body[field];

      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required.`);
        continue;
      }

      if (value === undefined || value === null || value === '') continue;

      if (rules.type === 'number') {
        const num = Number(value);
        if (isNaN(num)) { errors.push(`${field} must be a number.`); continue; }
        if (rules.min !== undefined && num < rules.min) errors.push(`${field} must be >= ${rules.min}.`);
        if (rules.max !== undefined && num > rules.max) errors.push(`${field} must be <= ${rules.max}.`);
      }

      if (rules.type === 'string' || typeof value === 'string') {
        const str = String(value);
        if (rules.minLength !== undefined && str.length < rules.minLength) errors.push(`${field} must be at least ${rules.minLength} characters.`);
        if (rules.maxLength !== undefined && str.length > rules.maxLength) errors.push(`${field} must be at most ${rules.maxLength} characters.`);
      }

      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`${field} must be one of: ${rules.enum.join(', ')}.`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(' ') });
    }

    next();
  };
}

module.exports = validate;
