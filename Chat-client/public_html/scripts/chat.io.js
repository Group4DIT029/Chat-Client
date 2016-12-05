/**
 * An mqtt chatt client originally connected to a backend written in node.js and using a mosca module as the broker
 * Author: original authour happiestcoder
 * source: https://github.com/happiestcoder/mqtt-chat
 * Licences: The MIT License (MIT)
 * Copyright: (c) https://github.com/happiestcoder/mqtt-chat
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * revision:
 * 2016-11-27, Sayf Rashid:
 *      - Changes made as part of the course DIT029 H16 Project: Software Architecture for Distributed Systems in the SEM program in Gothenburg university. 
 *      - Removing the server, we are going to use the PRATA broker(right now mqttdashboard is used) and erlang will be responsible for connecting to the mysql server and handling the chat history. 
 *      - Implementing all the server functionality(either through an erlang client or finding a variant by using the chat client directly). For example seeing which clients are subscribing to the chatroom.
 *      - 'old' room where the client can see the chat history of the specific chat room(an erlang client will responsible of storing and publishing the old messages).
 *      - Private chat, the ability to directly chat with another client by creating a room comprimising of both their client Ids.
 *      - Removed manually add user (the user nickname and UUID(which will be the client Id) will be handled elsewhere).
 *      
 */  

(function($){

    // create global app parameters...
    var serverAddress = 'broker.mqttdashboard.com', //server ip
        port = 8000, //port
        mqttClient = null,
        nickname = randomString(6),
        currentRoom = null,
        nick = null,
   
        tmplt = {
            room: [
                '<li data-roomId="${room}">',
                '<span class="icon"></span> ${room} <div style="${lockCss}"><img src="images/lock.png"/></div>',
                '</li>'
            ].join(""),
            client: [
                '<li data-clientId="${clientId}" class="cf">',
                '<div class="fl clientName"><span class="icon"></span> ${nickname}</div>',
                '<div class="fr composing"></div>',
                '</li>'
            ].join(""),
            message: [
                '<li class="cf">',
                '<div class="fl sender">${sender}: </div><div class="fl text">${text}</div><div class="fr time">${time}</div>',
                '</li>'
            ].join(""),
            image: [
                '<li class="cf">',
                '<div class="fl sender">${sender}: </div><div class="fl image"><canvas style="margin-left: 100px" class="img_uploaded"></canvas></div><div class="fr time">${time}</div>',
                '</li>'
            ].join("")
        };
        
    function connect(){
        mqttClient = new Messaging.Client(serverAddress, port, nickname);
        mqttClient.connect({onSuccess:onConnect, keepAliveInterval: 0});
        mqttClient.onMessageArrived = onMessageArrived;
    }
    
    function onConnect() {
        $('.chat input').focus();
        currentRoom = '1';
        mqttClient.subscribe(atopicName(currentRoom));
        mqttClient.subscribe('ConnectingSpot/onlineclient/#');
        mqttClient.subscribe('ConnectingSpot/roomclients/#');

        initRoom(currentRoom);
        addRoom('old',false,false);

        mqttClient.subscribe(nickname);   
        var msag = new Messaging.Message(JSON.stringify({"_id": currentRoom,  "clientIds": nickname, is: "online"})); 
            msag.destinationName = 'ConnectingSpot/onlineclient/' + nickname;
            msag.qos = 1;
            msag.retained = true;
            mqttClient.send(msag);  
    };
    
    window.onload = function() {
      connect();
    };
        
       
    jQuery(window).bind(
        "beforeunload", 
        function() { 
        removeFromRoom();
        var msag = new Messaging.Message(''); 
            msag.destinationName = 'ConnectingSpot/onlineclient/' +nickname;
            msag.qos = 1;
            msag.retained = true;
            mqttClient.send(msag);
        }
    )
    
    function changeRoom(room) { 
          var msag = new Messaging.Message(JSON.stringify({"_id": room,  "clientIds": nickname, is: "online"})); 
            msag.destinationName = 'ConnectingSpot/onlineclient/' + nickname;
            msag.qos = 1;
            msag.retained = true;
            mqttClient.send(msag); 
    }
    
    function removeFromRoom() { 
         var msag = new Messaging.Message(JSON.stringify({"_id": currentRoom,  "clientIds": nickname, is: "offline"})); 
            msag.destinationName = 'ConnectingSpot/roomclients/' + nickname;
            msag.qos = 1;
            mqttClient.send(msag);
    }

    function bindDOMEvents(){
        $('.chat-input input').on('keydown', function(e){
            var key = e.which || e.keyCode;
            if(key == 13) { handleMessage(); }
        });

        $('.chat-upload input').on('change', function(){
            var uploadedFiles = this.files;
                handlePictureUpload(uploadedFiles, function() {
                this.files = undefined;
            });
        });

        $('.chat-submit button').on('click', function(){
            handleMessage();
        });

        $('.chat-rooms ul').on('scroll', function(){
            $('.chat-rooms ul li.selected').css('top', $(this).scrollTop());
        });

        $('.chat-messages').on('scroll', function(){
            var self = this;
            window.setTimeout(function(){
                if($(self).scrollTop() + $(self).height() < $(self).find('ul').height()){
                    $(self).addClass('scroll');
                } else {
                    $(self).removeClass('scroll');
                }
            }, 50);
        });

        $('.chat-rooms ul li').live('click', function(){
            var room = $(this).attr('data-roomId');
         
            if(room != currentRoom){
               
                if(currentRoom != '1' && currentRoom != 'old'){
                        removeRoom(currentRoom);
                    }
                    if(room == 'old'){
                        var theRoom = currentRoom;
                        mqttClient.subscribe('ConnectingSpot/'+theRoom+'/'+nickname);
                        switchRoom(room);
                        var msg = new Messaging.Message(JSON.stringify({room: atopicName(theRoom), id: 'ConnectingSpot/'+theRoom+'/'+nickname}));
                            msg.destinationName = 'ConnectingSpot/Database/select';
                            msg.qos = 1;
                            mqttClient.send(msg);
                     
                }else{
                    mqttClient.unsubscribe(atopicName(currentRoom));
                    mqttClient.subscribe(atopicName(room));
                    
                    switchRoom(room);
                }
                    
            }
        });
        
        $('.chat-clients ul li').live('click', function(){
            var client = $(this).attr('data-clientId');
            if(client != nickname){
                
                var msg = new Messaging.Message(JSON.stringify({room:nickname+'-'+client}));
                msg.destinationName = client;
                msg.qos = 1;
                mqttClient.send(msg);
                addRoom(nickname+'-'+client,false,false);
            }
        });
    }
  
    function atopicName(a) {
    return 'ConnectingSpot/Chatroom/'+a;
  } 

    function addRoom(name, announce, protected){
        var lockCss = 'display: ' + (protected? 'inline' : 'none');
        if($('.chat-rooms ul li[data-roomId="' + name + '"]').length == 0){
            $.tmpl(tmplt.room, { room: name, lockCss: lockCss}).appendTo('.chat-rooms ul');  
        }
    }

    function removeRoom(name){
        $('.chat-rooms ul li[data-roomId="' + name + '"]').remove();
    }

    function addClient(client, announce, isMe){
        var $html = $.tmpl(tmplt.client, client);
        if(isMe){
            $html.addClass('me');
        }
        if($('.chat-clients ul li[data-clientid="' + client.clientId + '"]').length == 0){
            $html.appendTo('.chat-clients ul');
        }
    }

    function setCurrentRoom(room, protected){
        currentRoom = room;
        isRoomProtected = protected;
        $('.chat-rooms ul li.selected').removeClass('selected');
        $('.chat-rooms ul li[data-roomId="' + room + '"]').addClass('selected');
    }
     function randomString(length) {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (var i = 0; i < length; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        return text;
    }
    // handle the client messages
    function handleMessage(){
        if(currentRoom != 'old'){
       
        var message = $('.chat-input input').val().trim();
        if(message){
            // send the message to the server with the room name
            var msg = new Messaging.Message(JSON.stringify({nickname: nickname, message: message, timestamp: Date.now()}));
            msg.destinationName = atopicName(currentRoom);
            msg.qos = 1;
            mqttClient.send(msg);
            
            $('.chat-input input').val('');
        } 
    }}

    function handlePictureUpload(files, callback) {
        for(var i = 0; i < files.length; i++) {
            // send the message to the server with the room name
            var reader = new FileReader();
            reader.onloadend = function(evt) {
                var msg = new Messaging.Message(JSON.stringify({nickname: nickname, message: evt.target.result,timestamp: Date.now(), type: 'image'}));
                msg.destinationName = atopicName(currentRoom);
                msg.qos = 1;
                mqttClient.send(msg);
            };
            reader.readAsDataURL(files[i]);
        }
        callback();
    }
    // insert a message to the chat window, this function can be
    // called with some flags
    function insertMessage(sender, message, time, isMe, isServer){
        if (typeof time === 'string' || time instanceof String){
            var a = parseInt(time);
            time = a;
        }
        var $html = $.tmpl(tmplt.message, {
            sender: sender,
            text: message,
            time: getTime(time)
        });
        setMessageCss($html, isMe, isServer);
    }

    function insertImage(sender, message, time, isMe, isServer){
        if (typeof time === 'string' || time instanceof String){
            var a = parseInt(time);
            time = a;
        }
        var $html = $.tmpl(tmplt.image, {
            sender: sender,
            time: times(time)
        });
        var img = new Image();
        var canvas = $html.find('.img_uploaded')[0];
        var context = canvas.getContext('2d');
        img.src= message;
        img.onload = function() {
            context.drawImage(img,0,0,200,180);
        };
        setMessageCss($html, isMe, isServer);
    }

    function setMessageCss($html, isMe, isServer){
        if(isMe){
            $html.addClass('marker');
        }
        $html.appendTo('.chat-messages ul');
        $('.chat-messages').animate({ scrollTop: $('.chat-messages ul').height() }, 100);
    }

    function getTime(tim){
        var date = new Date(tim);
        return (date.getHours() < 10 ? '0' + date.getHours().toString() : date.getHours()) + ':' +
            (date.getMinutes() < 10 ? '0' + date.getMinutes().toString() : date.getMinutes());
    }
    
    function removeClient(client){
        $('.chat-clients ul li[data-clientId="' + client + '"]').remove();
}
    
   function onMessageArrived(message) {
        var msg = JSON.parse(message.payloadString);
        var topic = message.destinationName;
         if(topic == nickname) {
            addRoom(msg.room,false,false);
        } else {
           if(msg.is == 'online'){
                 if(msg._id == currentRoom && msg._id != ('old')) {
                for(var i = 0, len = msg.clientIds.length; i < len; i++){
                    if(msg.clientIds && msg.clientIds != nickname){
                        addClient({nickname: msg.clientIds, clientId: msg.clientIds}, false);
                        nick.push(msg.clientIds);
                    }
                }
            }
                
            }
            if(msg.is == 'offline'){
                 if(msg._id == currentRoom && msg._id != ('old')) {
                        removeClient(msg.clientIds);
            }
                
            } if(msg.type == 'image' && msg.is != 'online' && msg.is != 'offline' ) {
                insertImage(msg.nickname, msg.message, msg.timestamp, msg.nickname == nickname, false);
             
            }
            else if(msg.is != 'online' && msg.is != 'offline')  {
                insertMessage(msg.nickname, msg.message, msg.timestamp, msg.nickname == nickname, false);
            }
        }
    }

    function initRoom(room, protected) {
        addRoom(room, false, protected);
        setCurrentRoom(room, protected);
        $('.chat-clients ul').empty();
        addClient({ nickname: nickname, clientId: nickname }, false, true);
    }

    function switchRoom(room) {
        mqttClient.unsubscribe('ConnectingSpot/onlineclient/#');
        removeFromRoom();
        setCurrentRoom(room);
        changeRoom(room);
        $('.chat-clients ul').empty();
        addClient({ nickname: nickname, clientId: nickname }, false, true);
        mqttClient.subscribe('ConnectingSpot/onlineclient/#');
       
    }

    $(function(){
        bindDOMEvents();
    });

})(jQuery);
