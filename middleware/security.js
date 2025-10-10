const helmet = require("helmet");
const createDOMPurify = require("dompurify");
const { JSDOM } = require("jsdom");

const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);

const sanitizeInput = (req, res, next) => {
  if (req.body.content) {
    req.body.content = DOMPurify.sanitize(req.body.content);
  }
  if (req.body.title) {
    req.body.title = DOMPurify.sanitize(req.body.title);
  }
  next();
};

const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "https://res.cloudinary.com"],
    },
  },
});

module.exports = { sanitizeInput, securityHeaders };
