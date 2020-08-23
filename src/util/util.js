// Returns `true` if the intersection of arrays `a` and `b` is not empty.
// Taken from: https://www.geeksforgeeks.org/how-to-find-if-two-arrays-contain-any-common-item-in-javascript/
const haveCommonElements = (a, b) => a.some((item) => b.includes(item));

base64Encode = (str) => Buffer.from(str, 'utf8').toString('base64');
base64Decode = (str) => Buffer.from(str, 'base64').toString('utf8');

module.exports = { haveCommonElements, base64Encode, base64Decode };
