var request = require('request');

function CaptchaDialog(site, id) {
    this.site = site;
    this.challenge = null;
    this.server = "http://www.google.com/recaptcha/api/";
    this.id = id;
    this.incorrect = false;
}
CaptchaDialog.prototype.getImageUrl = function() {
    if (this.challenge == null) throw new Error("There is no challenge!");
    return this.server + "image?c=" + this.challenge
}
CaptchaDialog.prototype.update = function() {
    var that = this;
    console.log("update invoked");
    this.challenge = null;
    var conn = {
        url: (this.server + "challenge?k=" + this.site + "&ajax=1&cachestop=" + Math.random())
    };
    return new Promise(function(resolve, reject) {
        request(conn, function(err, res, body) {
            var regexResult = body.match(/challenge\s*:\s*'([^']*?)'[\w\W]+?is_incorrect\s*:\s*([^,]+)/);
            that.challenge = regexResult[1];
            that.is_incorrect = regexResult[2] === "true";
            resolve();
        })
    })
}
CaptchaDialog.prototype.send=function(/*String*/ t) {
    var that=this;
        //System.out.println("send invoked (t = " + t + ")");
        var conn = {
        url: ("https://front1.omegle.com/recaptcha"),
        headers:{"User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:50.0) Gecko/20100101 Firefox/50.0"}
    };
    
     var f = { id: that.id,challenge:that.challenge,response:t }
        return new Promise(function(resolve, reject) {
        request.post(conn, function(err, res, body) {
            resolve("win".indexOf(body)>-1);
        }).form(f)
    })
      /*  URL u = new URL;
        HttpURLConnection c = (HttpURLConnection) u.openConnection();
        c.setRequestProperty("User-Agent", "Mozilla/5.0 (X11; Linux x86_64; rv:50.0) Gecko/20100101 Firefox/50.0");
        c.setDoOutput(true);
        OutputStreamWriter w = new OutputStreamWriter(c.getOutputStream());
        w.write("id=" + id + "&challenge=" + challenge + "&response=" + java.net.URLEncoder.encode(t, "UTF-8"));
        w.flush();
        w.close();
        BufferedReader r;
        try {
            r = new BufferedReader(new InputStreamReader(c.getInputStream()));
        } catch (FileNotFoundException e) {
            r = new BufferedReader(new InputStreamReader(c.getErrorStream()));
            System.out.println("CaptchaDialog 404");
        }
        boolean win = false;
        {
            String line;
            while ((line = r.readLine()) != null) {
                if (line.contains("win")) {
                    win = true;
                    if (callback != null)
                        callback.run();
                }
                System.out.println("line: " + line);
            }
        }
        r.close();
        return win;*/
    }
module.exports = CaptchaDialog;
