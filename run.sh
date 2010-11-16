# comma-delimited
SERVER=server.js
WATCHED=server.js,lib/storage.js

supervisor -w $WATCHED -p $SERVER
