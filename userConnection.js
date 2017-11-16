var Util = require("./util.js");
var request = require('request');

function UserConnection(callback) {
    this.id = ""
    this.proxy = { /*ProxyConfig*/ }
    this.questionMode = true
    this.server = this.chooseFront();
    //console.log("server=" + this.server)
    this.dummy = false
    this.msgCount = 0;
    this.connectedB = false;
    this.lived = false;
    this.accepted = false;
    this.birth = Number.MAX_VALUE;
    this.lastActive = (Number.MAX_VALUE);
    this.callback = callback;
    this.randid = Util.makeRandid();
    this.lang = "en";
    this.done = false;
    this.sysMess = "┋ ";


}
UserConnection.prototype.topics = JSON.stringify(["groupchat","irc","mlp","pony"])
UserConnection.prototype.getTopics = function() { return this.topics; }
UserConnection.prototype.fronts = Array.apply(null, Array(32)).map(function(a, b) { return { lastDirty: 0, dirty: function() { this.lastDirty = Date.now() }, isDirty: function() { return Date.now() - this.lastDirty < 10 * 60 * 1000; }, id: b + 1 } })
UserConnection.prototype.frontComparator = function(a, b) { return a.lastDirty - b.lastDirty /*Comparator.comparingLong(a -> a.lastDirty);*/ }
UserConnection.prototype.chooseFront = function() {
    var front = Util.randomize(this.fronts);
    if (front.isDirty()) {
        this.fronts = this.fronts.sort(this.frontComparator);
        front = this.fronts[0];
    }
    return front.id;
}

UserConnection.prototype.sendActionInner = function(action, msg) {
   // console.log("AAAAAAAAAAAAAAAAAAAAAFYFYF3")
    var ex, that = this;
    if (this.dummy) {
        if (action == ("send")) {
            console.log(msg);
        }
        else {
            console.log("[Dummy-" + action + "]" + msg);
        }
        return;
    }
    if (this.msgCount == -1 || !this.id) {
        return;
    }
    try {
        Util.retry(2, "Sending " + action + " (" + msg + ") to " + that.id, function() {
//console.log("AAAAAAAAAAAAAAAAAAAAAFYFYF2")
            var conn = {
                url: ("https://front" + that.server + ".omegle.com/") + (encodeURIComponent(action)),
                headers: {}
            };
            var f = { id: that.id }
            if (msg != null) {
                f["msg"] = msg;
            }
            Util.fillHeaders(conn, "post json");
            request.post(conn, function(err, res, body) {
          //      console.log("AAAAAAAAAAAAAAAAAAAAAFYFYF")
                if (err) { console.log("error", err); that.dirtyFront();throw err }
      //          console.log("sendActionResponse", body)

              //  that.handleEventsReply(JSON.parse(body));
            }).form(f);
            //   java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection(proxy.getProxy());
            //  conn.setDoOutput(true);
            //                Util.fillHeaders(conn, "post");
            /* OutputStreamWriter wr
                     = new OutputStreamWriter(conn.getOutputStream());
             if (msg != null) {
                 wr.write(new StringBuilder("msg=").append(URLEncoder.encode(spaceball(msg), "UTF-8")).append("&id=").append(id).toString());
             } else {
                 wr.write(new StringBuilder("id=").append(id).toString());
             }
             wr.flush();
             wr.close();
             BufferedReader rd;
             try {
                 rd = new BufferedReader(new InputStreamReader(conn.getInputStream()));
             } catch (java.io.FileNotFoundException e) {
                 rd = new BufferedReader(new InputStreamReader(conn.getErrorStream()));
                 log(getDisplayNick() + " UserConnection 404");
                 dirtyFront(server);
             }
             rd.readLine();
             rd.close();*/
        });
    }
    catch (ex) {
        console.log(this.id + " had exception: " + ex);
        this.dirtyFront(this.server);
        // ex.printStackTrace();
    }
}
UserConnection.prototype.banned = function(type) {
    this.callback("ban", type);
}
UserConnection.prototype.sendMessage = function(message) {
    this.sendAction("send", message);
}
UserConnection.prototype.establishChat = function() {

    var conn = {
            url: "https://front" + this.server + ".omegle.com/start?rcs=1&firstevents=1&spid=&randid=" + this.randid + (this.ask?"&ask="+encodeURIComponent(this.ask):(this.questionMode ? "&wantsspy=1" : (this.topics?"&topics="+this.getTopics():""))) + "&lang=" + this.lang,
            headers: {}
        },err,
        that = this;



    Util.fillHeaders(conn, "json post");


    var PromiseId = new Promise(function(resolve, reject) {
        request.get(conn, function(err, res, body) {
            //if(err){reject(err);return}
            if (body == "") {
                that.banned("empty reply")
                resolve(null)
            }
            else if (body == "{}") {
                that.banned("empty object");
                resolve(null)
            }
            else {
                try{
                var json = JSON.parse(body);
                }catch(err){console.log("JSON PARSE ERROR",body);throw new Error("json")}
                resolve(that.id = json.clientID);
                //console.log("executed2!",json)
                that.handleEventsReply(json.events);
            }
            /*res.setEncoding('utf8');
            res.on('data', function(chunk) {
                console.log('Response: ' + chunk);
            });*/
        });
    })
    return PromiseId;

    //post_req.setTimeout(5 * 60 * 1000);

}
UserConnection.prototype.sendAction = function(action, msg) {
    while (msg != null && msg.length > 1500) {
        var left = msg.substring(0, msg.length < 2500 ? 1000 : 1500);
        var seam = left.lastIndexOf("\nban ?off =");
        if (seam == -1)
            seam = left.lastIndexOf("\n");
        if (seam == -1)
            seam = left.lastIndexOf(". ") + 2;
        if (seam == 1)
            seam = left.lastIndexOf(" ") + 1;
        if (seam == 0 || seam < 300) {
            this.sendActionInner(action, left);
            msg = msg.substring(left.length);
        }
        else {
            this.sendActionInner(action, left.substring(0, seam));
            msg = msg.substring(seam);
        }
    }
    this.sendActionInner(action, msg);
}
UserConnection.prototype.dirtyFront = function(id) {

    var d = (this.fronts).filter(function(a) { return a.id == id })[0]
    if (d) d.dirty();

}
UserConnection.prototype.connectedF = function() {
    if (!this.connectedB) {
        this.connectedB = true;
        this.lived = true;
        if (this.accepted) {
            this.birth = System.currentTimeMillis();
            this.lastActive = System.currentTimeMillis();
        }
        //this.proxy.undirty();
        this.callback("connected", null);
        if (!this.accepted)
            console.log("[] " + this.id + " has connected");
    }
}
UserConnection.prototype.gotMessage = function(line) {
    //console.log(line)
    /*if (!this.accepted) {
        if (line.match("I agree")) {
            this.sendMessage("I agree");
            this.sendMessage("although I'm a bot myself!");
        }
        if (entryLine(line)) {
            this.accepted = true;
            this.birth = System.currentTimeMillis();
            this.callback("accepted", null);
            this.typing = false;
            this.msgCount++;
            return;
        }
    }*/
    this.lastLine = line;
    this.callback("message", line);
}
UserConnection.prototype.handleEventsReply = function(events) {
    var that = this;
    events.forEach(function(event) {
        if (!Array.isArray(event) ||
            event.length < 1 ||
            typeof event[0] != "string") {
            console.log("handleEventsReply" + ": Badly formed event: " + event);
            return;
        }
        that.handleEvent(event[0], event.slice(1));
    })
}
UserConnection.prototype.handleEvent = function( /*String*/ event, /*List<JsonValue>*/ args) {
    //console.log("Event handling:", event, args)
    if (event == "recaptchaRequired" || event == "recaptchaRejected") {

        if (!(args[0] && typeof args[0] == "string"))
            console.log(this + ": Captcha challenge missing:" + args);
        else
            this.callback("captcha", args[0]);
    }
    else if (event == "antinudeBanned") {
        this.banned("antinudeBanned");
    }
    else if (event == ("typing")) {
        this.lastActive = Date.now();
        this.callback("typing", null);
        this.typing = true;
    }
    else if (event == ("stoppedTyping")) {
        this.lastActive = Date.now();
        this.callback("stoppedtyping", null);
        this.typing = false;
    }
    else if (event == ("question")) {
        if (!(args[0] && typeof args[0] == "string"))
            console.log(this + ": Question missing: " + args);
        else
            this.question = args[0];
        this.connectedF();
        //Util.sleep(200);
    }
    else if (event == ("gotMessage")) {
        this.connectedF();
        this.lastActive = Date.now();
        if (!(args[0] && typeof args[0] == "string")) {
            console.log(this + ": Message missing: " + args);
        }
        else {
            this.gotMessage(args[0]);
        }
        this.typing = false;
        this.msgCount++;
    }
    else if (event == ("strangerDisconnected")) {
        this.connected = false;
        this.callback("disconnected", null);
        this.msgCount = -1;
    }
    else if (event == ("connected") && !this.questionMode) {
        this.connectedF();
    }
    else if (event == ("commonLikes")) {
        if (args.length == 0 || !Array.isArray(args[0])) {
            console.log(this + ": Common likes missing: " + args);
        }
        else {
            this.commonLikes = args[0];
            var sb;
            args[0].forEach(function(v) {

                sb += (", ") + (v);
            })
            if (sb.length > 0) {
                this.commonLikesFlat = sb.substring(2);
                // hasCommonLikes(this.commonLikesFlat);
            }
        }
    } else this.callback(event,args)
}
UserConnection.prototype.dirtyFront = function(id) {
    this.fronts.filter(function(a) { a.id == id }).slice(0, 1).forEach(function(a) { a.dirty() })

}
UserConnection.prototype.handleEvents = function() {
    // console.log("HandleEvents executed")
    var ex, that = this;

    try {
        Util.retry(4, "Getting events for " + that.id, function() {

            var conn = {
                url: "https://front" + that.server + ".omegle.com/events",
                headers: {}
            };
            Util.fillHeaders(conn, "post json");
            request.post(conn, function(err, res, body) {
                if (err) { console.log("error", err); throw err }
        //        console.log("handleEventsResponse", res && res.statusCode, body)
var json=JSON.parse(body)
//console.log("what is going on?",res.statusCode,body)
                if (Array.isArray(json)) {
                    that.handleEventsReply(json);
                    setTimeout(that.handleEvents.bind(that), 150);
                }else{that.callback("close","polling is over")}
            }).form({ id: that.id });

        });
    }
    catch (ex) {
        that.connected = false;
        that.callback("died", ex);
        that.dirtyFront(that.server);
        console.log(ex);
    }

}
UserConnection.prototype.init = function() {
    var that = this;
    this.establishChat().then(function(id) {

        if (id != null) {
            //var i=setInterval(function(){},75)
            that.handleEvents();
        }
    }).catch(console.log.bind(console))

}
module.exports = UserConnection;
