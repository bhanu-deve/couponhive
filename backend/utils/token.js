const jwt = require('jsonwebtoken');

exports.signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

exports.sendToken = (user, statusCode, res) => {
  const token = exports.signToken(user._id);
  res.status(statusCode).json({ token, user });
};
