// Returns `true` if the intersection of arrays `a` and `b` is not empty.
// Taken from: https://www.geeksforgeeks.org/how-to-find-if-two-arrays-contain-any-common-item-in-javascript/
const haveCommonElements = (a, b) => a.some((item) => b.includes(item));

module.exports = { haveCommonElements };
