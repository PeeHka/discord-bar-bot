const { BOT_OWNER_ID } = require("./config");
function isOwner(i){ return i.user.id === BOT_OWNER_ID; }
module.exports = { isOwner };
