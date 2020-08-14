// Small helper to make constructing responses easier.
// If `message_or_body` is a string, it will be wrapped in an object as the `message` property, else it will be passed
// as-is.
module.exports = (h, message_or_body, statusCode = 200) => {
    const body =
        typeof message_or_body === 'string'
            ? { message: message_or_body, statusCode }
            : { ...message_or_body, statusCode };
    return h.response(body).code(statusCode);
};
