# Chat-Client
mqtt chat client 
the original version of the chat is located in https://github.com/happiestcoder/mqtt-chat

- Changes mades 

- removing the server
- implementing all the server functionality(either through an erlang client or finding a variant by using the chat client directly).
- 'old' room where the client can see his the old messages of the specific chat room(an erlang client will responsible of storing and publishing the queries).
- the ability to directly chat with another client by creating a room.
