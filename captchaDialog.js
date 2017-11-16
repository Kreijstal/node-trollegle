var request = require('request');
function CaptchaDialog(site,id){
 this.site=site; 
 this.challenge=null;
 this.server = "http://www.google.com/recaptcha/api/";
 this.id=id;
 this.incorrect=false;
}
CaptchaDialog.prototype.getImageUrl=function(){
if(this.challenge==null)throw new Error("There is no challenge!")
return this.server + "image?c=" + this.challenge 
}
CaptchaDialog.prototype.update=function() {
        console.log("update invoked");
        this.challenge = null;
        var conn = {
                url: (this.server + "challenge?k=" + this.site + "&ajax=1&cachestop=" + Math.random())
            };
        return new Promise(function(resolve,reject){
        request(conn, function(err, res, body) {
        var regexResult=body.match(/challenge\s*:\s*'([^']*?)'[\w\W]+?is_incorrect\s*:\s*([^,]+)/);
        console.log(body,regexResult,"AAA")
        this.challenge=regexResult[1];
        this.is_incorrect=regexResult[1]==="true";
        resolve();
            })
            })
    }
module.exports = CaptchaDialog;