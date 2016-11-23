(function($){

    // create global app parameters...
    var serverAddress = 'broker.mqttdashboard.com', //server ip
        port = 8000, //port
         mqttClient = null,
        nickname = randomString(6),
        currentRoom = null,
   
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
        mqttClient.subscribe('ConnectingSpot/bot');
        mqttClient.subscribe('ConnectingSpot/totalclients');
        
        initRoom(currentRoom);
        addRoom('old',false,false);
        seUser();
        mqttClient.subscribe(nickname);
        var msag = new Messaging.Message(JSON.stringify({"_id": currentRoom,  "clientIds": nickname})); 
            msag.destinationName = 'ConnectingSpot/test';
            msag.qos = 1;
            mqttClient.send(msag);  
         
         };
    
        window.onload = function() {
          connect();
        };
        
        
       
jQuery(window).bind(
    "beforeunload", 
    function() { 
        var msag = new Messaging.Message(JSON.stringify({"_id": "currefdfntRoom",  "clientIds": "nickfdfdname"})); 
            msag.destinationName = 'ConnectingSpot/test';
            msag.qos = 1;
            mqttClient.send(msag);
    }
)


     
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
               
                if(currentRoom != '1' && currentRoom != 'old'){
                        removeRoom(currentRoom);
                    }
                    if(room == 'old'){
                    mqttClient.unsubscribe(atopicName(currentRoom));
                    mqttClient.subscribe(atopicName(nickname));
                    switchRoom(room);
                    var msg = new Messaging.Message(JSON.stringify({room: atopicName(currentRoom), nickname: atopicName(nickname)}));
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
    function rtopicName(a) {
    return a.substring(a.lastIndexOf("/")+1);
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
        } seUser();
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
        var $html = $.tmpl(tmplt.message, {
            sender: sender,
            text: message,
            time: getTime(time)
        });
        setMessageCss($html, isMe, isServer);
    }

    function insertImage(sender, message, time, isMe, isServer){
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
    
    function seUser(){
        if(currentRoom != 'old'){
        $('.chat-clients ul').empty();
        addClient({ nickname: nickname, clientId: nickname }, false, true);
        var msig = new Messaging.Message(JSON.stringify({"message": "bot"}));
        msig.destinationName = 'ConnectingSpot/bot';
        msig.qos = 1;
        mqttClient.send(msig);
      }
    }
    
   function onMessageArrived(message) {
        var msg = JSON.parse(message.payloadString);
        var topic = message.destinationName;
        if(topic == 'ConnectingSpot/bot') {
            
            var msag = new Messaging.Message(JSON.stringify({"_id": currentRoom,  "clientIds": nickname})); 
            msag.destinationName = 'ConnectingSpot/totalclients';
            msag.qos = 1;
            mqttClient.send(msag);
            
        } else if(topic == nickname) {
            addRoom(msg.room,false,false);
        } else if(topic == 'ConnectingSpot/totalclients') {
            if(msg._id == currentRoom && msg._id != atopicName('old')) {
                for(var i = 0, len = msg.clientIds.length; i < len; i++){
                    if(msg.clientIds && msg.clientIds != nickname){
                        addClient({nickname: msg.clientIds, clientId: msg.clientIds}, false);
                    }
                }
            }
        } else {
            if(msg.type == 'image') {
                insertImage(msg.nickname, msg.message, msg.timestamp, msg.nickname == nickname, false);
             
            } else  {
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
        setCurrentRoom(room);
        seUser();
    }

    $(function(){
        bindDOMEvents();
    });

})(jQuery);
