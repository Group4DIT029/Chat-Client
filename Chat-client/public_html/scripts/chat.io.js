(function($){

    // create global app parameters...
    var serverAddress = 'broker.mqttdashboard.com', //server ip
        port = 8000, //port
         mqttClient = null,
        nickname = randomString(10),
        currentRoom = null,
        
        serverDisplayName = 'MQTT Chat',
        serverDisplayColor = '#1c5380',

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

        $('.big-button-green.start').on('click', function(){
            connect();
        });

        $('.chat-right .le-button').on('click', function(){
            seUser();
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
                
                    mqttClient.unsubscribe(currentRoom);
                    mqttClient.subscribe(room);
                    switchRoom(room);
                
            }
        });
        
        $('.chat-clients ul li').live('click', function(){
            var client = $(this).attr('data-clientId');
            if(client != nickname){
                
                var msg = new Messaging.Message(JSON.stringify({room:nickname+'-'+client}));
                msg.destinationName = client;
                mqttClient.send(msg);
                addRoom(nickname+'-'+client,false,false);
                
            }
        });
    }
    function topicName(a) {
    return a.substring(a.lastIndexOf("/")+1);
  } 

    function addRoom(name, announce, protected){
        var lockCss = 'display: ' + (protected? 'inline' : 'none');
        if($('.chat-rooms ul li[data-roomId="' + name + '"]').length == 0){
            $.tmpl(tmplt.room, { room: name, lockCss: lockCss}).appendTo('.chat-rooms ul');
            // if announce is true, show a message about this room
            
            if(announce){
                insertMessage(serverDisplayName, 'The room `' + name + '` created...', true, false, true);
            }
        }
    }

    function removeRoom(name, announce){
        $('.chat-rooms ul li[data-roomId="' + name + '"]').remove();
        // if announce is true, show a message about this room
        if(announce){
            insertMessage(serverDisplayName, 'The room `' + name + '` destroyed...', true, false, true);
        }
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
            msg.destinationName = currentRoom;
            mqttClient.send(msg);
            $('.chat-input input').val('');
        } 
    }}

    function handlePictureUpload(files, callback) {
            for(var i = 0; i < files.length; i++) {
                // send the message to the server with the room name
                var reader = new FileReader();
                reader.onloadend = function(evt) {
                    var msg = new Messaging.Message(JSON.stringify({nickname: nickname, message: evt.target.result, type: 'image'}));
                    msg.destinationName = currentRoom;
                    mqttClient.send(msg);
                };
                reader.readAsDataURL(files[i]);
            }
            callback();
    }
    // insert a message to the chat window, this function can be
    // called with some flags
    function insertMessage(sender, message, showTime, isMe, isServer){
        var $html = $.tmpl(tmplt.message, {
            sender: sender,
            text: message,
            time: showTime ? getTime() : ''
        });
        setMessageCss($html, isMe, isServer);
    }

    function insertImage(sender, message, showTime, isMe, isServer){
        var $html = $.tmpl(tmplt.image, {
            sender: sender,
            time: showTime ? getTime() : ''
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
        if(isServer){
            $html.find('.sender').css('color', serverDisplayColor);
        }
        $html.appendTo('.chat-messages ul');
        $('.chat-messages').animate({ scrollTop: $('.chat-messages ul').height() }, 100);
    }

    function getTime(){
        var date = new Date();
        return (date.getHours() < 10 ? '0' + date.getHours().toString() : date.getHours()) + ':' +
            (date.getMinutes() < 10 ? '0' + date.getMinutes().toString() : date.getMinutes());
    }

    function connect(){
        $('.chat-shadow .content').html('Connecting...');
        mqttClient = new Messaging.Client(serverAddress, port, nickname);
        mqttClient.connect({onSuccess:onConnect, keepAliveInterval: 0});
        mqttClient.onMessageArrived = onMessageArrived;
    }
    
    function seUser(){
        if(currentRoom != 'old'){
        $('.chat-clients ul').empty();
            addClient({ nickname: nickname, clientId: nickname }, false, true);
        $('.chat-shadow').animate({ 'opacity': 0 }, 200, function(){
            $(this).hide();
            $('.chat input').focus();
        });
        mqttClient.subscribe(nickname);
        var msig = new Messaging.Message(JSON.stringify({"message": "bot"}));
        msig.destinationName = 'ConnectingSpot/bot';
        mqttClient.send(msig);
      }
    }

    function onConnect() {
        $('.chat-shadow').animate({ 'opacity': 0 }, 200, function(){
            $(this).hide();
            $('.chat input').focus();
        });
        currentRoom = '1';
        mqttClient.subscribe('ConnectingSpot/Chatroom/'+currentRoom);
        mqttClient.subscribe('ConnectingSpot/bot');
        mqttClient.subscribe('ConnectingSpot/totalclients');
        
        initRoom(currentRoom);
        addRoom('old',false,false);
        seUser();
    };

   function onMessageArrived(message) {
        var msg = JSON.parse(message.payloadString);
        var topic = message.destinationName;
        if(topic == 'ConnectingSpot/bot') {
            
            var msag = new Messaging.Message(JSON.stringify({"_id": currentRoom,  "clientIds": nickname})); 
            msag.destinationName = 'ConnectingSpot/totalclients';
            mqttClient.send(msag);
            
        } else if(topic == nickname) {
            addRoom(msg.room,false,false);
        } else if(topic == 'ConnectingSpot/totalclients') {
            if(msg._id == currentRoom && msg._id != 'old') {
                for(var i = 0, len = msg.clientIds.length; i < len; i++){
                    if(msg.clientIds && msg.clientIds != nickname){
                        addClient({nickname: msg.clientIds, clientId: msg.clientIds}, false);
                    }
                }
            }
        } else {
            if(msg.type == 'image') {
                insertImage(msg.nickname, msg.message, true, msg.nickname == nickname, false);
                seUser();
            } else  {
                insertMessage(msg.nickname, msg.message, true, msg.nickname == nickname, false);
                seUser();
            }
        }
    }

    function initRoom(room, protected) {
        addRoom(room, false, protected);
        setCurrentRoom(room, protected);
        insertMessage(serverDisplayName, 'Welcome to the room: `' + room + '`... enjoy!', true, false, true);
        $('.chat-clients ul').empty();
        addClient({ nickname: nickname, clientId: nickname }, false, true);
        $('.chat-shadow').animate({ 'opacity': 0 }, 200, function(){
            $(this).hide();
            $('.chat input').focus();
        });  
    }

    function switchRoom(room) {
        setCurrentRoom(room);
        insertMessage(serverDisplayName, 'Welcome to the room: `' + room + '`... enjoy!', true, false, true);
        $('.chat-clients ul').empty();
        addClient({ nickname: nickname, clientId: nickname }, false, true);
        $('.chat-shadow').animate({ 'opacity': 0 }, 200, function(){
            $(this).hide();
            $('.chat input').focus();
        });
        seUser();
    }

    $(function(){
        bindDOMEvents();
    });

})(jQuery);
