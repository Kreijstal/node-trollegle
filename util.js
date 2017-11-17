var RANDID_PIECES = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
var ALNUM_PIECES = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    
    module.exports.makeRandid =function() {
        return randId(RANDID_PIECES, 8);
    }

    function randId(pieces, length) {
        var b = "";
        while (b.length< length) {
            b+=(pieces.charAt(Math.round(pieces.length * Math.random())));
        }
        return b;
    }
    module.exports.retry= function( times,  description,  action) {
        var e;
        var t=arguments.callee;
        if(times--){
            try {
                action();
                return
            } catch (e) {
                if (times < 1)
                    throw e;
                console.log(description + " (will retry " + times + "x): " + e);
                setTimeout(function(){t(times,description,action)},250);
            }
        }
    }
    var fillUserAgent=(module.exports.fillUserAgent=function fillUserAgent(conn) {
    Object.assign(conn, { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:50.0) Gecko/20100101 Firefox/50.0" });
    })
    module.exports.fillHeaders=function (conn, s) {
        s = " " + s + " ";
        fillUserAgent(conn);
        if (s.match(" json ")) {
            Object.assign(conn.headers, { "Accept": "application/json" });
        }
        else {
            Object.assign(conn.headers, { "Accept": "text/javascript, text/html, application/xml, text/xml, */*" });
        }
        if (s.match(" post ")) {
            Object.assign(conn.headers, { "Content-Type": "application/x-www-form-urlencoded; charset=utf-8" });
        }
        Object.assign(conn.headers, {
            "Accept-Language": "en-US;en;q=0.5",
            "origin": "https://www.omegle.com",
            "Referer": "https://www.omegle.com/"
        });
        /*conn.setRequestProperty("Cookie", "randid=" + randid);
         conn.setRequestProperty("Cookie", "__cfduid=dfae36274feb8aa94d2e83a69086255d91470913354");
         conn.setRequestProperty("Cookie", "fblikes=0");*/
    }
    module.exports.randomize=function randomize(choices) {
        return choices[Math.round(Math.random() * choices.length)];
    }