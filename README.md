# Chat-Client
- mqtt chat client 
- the original version of the chat is located in https://github.com/happiestcoder/mqtt-chat

# Changes made

- Removing the node.js backend including the embedded broker "mosca",(an external broker needs to be used).

- Implementing all the backend functionality(by using the chat client directly).

- 'Chat History' room where the client can see the old messages of the specific chat room(an erlang client will responsible for retrieving the old messages). https://github.com/Group4DIT029/Erlang-Database-mqttClient

- The ability to directly chat with another client by creating a room comprising of both their client Ids.

- Removed manually add user (the user nickname and UUID(which will be the client Id) will be handled elsewhere)

- Online users updates automatically

# Usage
- Private chat entered by clicking on the user you wish to chat with and entering the room.
- The chat history of the specific room is requested by entering the room "Chat History".
