var userConnection=require('./userConnection.js');
console.log('executed!')
//key=Z6fdHqcmNVwaYWPyq8

var callback= function (/*MultiUser*/ user, /*String*/ method, /*String*/ data) {
    console.log('callback!',arguments)
    /*
            if (user != null && !users.contains(user) && !user.isDummy()) {
                return;
            }
        
        //System.out.println("callback: '" + user + "', '" + method + "', '" + data + "'");
        if (method.equals("captcha")) {
            if (user.isPulseEver()) {
                lastPulse = 0;
            }
            captchad(user, data);
        } else if (method.equals("ban")) {
            if (user.isPulseEver()) {
                lastPulse = 0;
            }
            banned(user.getProxy(), data);
        } else if (method.equals("died")) {
            user.getProxy().dirty();
            switchProxy();
            tellAdmin("Connection died: " + user);
            remove(user);
        } else if (method.equals("disconnected")) {
            remove(user);
        } else if (method.equals("typing")) {
            typing(user);
        } else if (method.equals("stoppedtyping")) {
            stoppedTyping(user);
        } else if (method.equals("message")) {
            hear(user, data);
        } else if (method.equals("connected") || method.equals("accepted")) {
            welcome(user);
        } else if (method.equals("interests")) {
            tellAdmin("Joined with " + data);
        } else if (method.equals("pulse success")) {
            tellAdmin("Pulse, joined with " + data);
            addPulse();
        } else if (method.equals("chatname")) {
            chatName = data;
        } else if (method.equals("tor found")) {
            tellAdmin("Tor circuit found for: " + data);
            if (proxy.isBanned() || proxy.isDirty()) {
                switchProxy();
            }
        } else if (method.equals("tor aborted")) {
            tellAdmin("Tor search aborted for: " + data);
        } else if (method.equals("tor failed")) {
            tellAdmin("Tor search failed for: " + data);
        } else if (method.equals("tor duplicate")) {
            checkTorDuplicate(data);
        } else {
            System.err.println("\n\n\nUNKNOWN CALLBACK METHOD '" + method + "'\n\n\n");
        }
        */
    }
    var user=new userConnection(callback);
    user.init();
