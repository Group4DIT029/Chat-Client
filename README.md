# Chat-Client
- mqtt chat client 
- the original version of the chat is located in https://github.com/happiestcoder/mqtt-chat

# Changes made

- removing the server

- implementing all the server functionality(either through an erlang client or finding a variant by using the chat client directly).

- 'old' room where the client can see his the old messages of the specific chat room(an erlang client will responsible of storing and publishing the queries).

- The ability to directly chat with another client by creating a room comprimising of both their client Ids.

- Removed manually add user (the user nickname and UUID(which will be the client Id) will be handled elsewhere)

- added update online users

# Usage
- Private chat entered by clicking on the user you wish to chat with and entering the room.
- Update the client list by clicking on icon next to "see all users" notification
