//Hello, so this would be where you create new commands
var credentials = require('./credentials.json')

function StateMachine(states) {
  this.states = states;
  this.indexes = {};
  for (var i = 0; i < this.states.length; i++) {
    this.indexes[this.states[i].name] = i;
    if (this.states[i].initial) {
      this.currentState = this.states[i];
    }
  }
};
StateMachine.prototype.consumeEvent = function(e) {
  if (this.currentState.events[e]) {
    this.currentState = this.states[this.indexes[this.currentState.events[e]]];
  }
}
StateMachine.prototype.getStatus = function() {
  return this.currentState.name;
}

function workshopBot(chatbot, omeglebot) {
  //creating the !roll command
  chatbot.createCommand('roll', /^(-?\d+)[ ,](-?\d+)/, function(min, max) {
    this.send('Rolling: ' + (Math.round(Math.random() * (+max - min)) + +min));
  });
  //creating the !hello command
  chatbot.createCommand('hello', /(?:)/, function() {
    this.send('hello there ' + (this.currentUser ? this.currentUser : ""));
  });
  //creating the omegle command
  var omegleConnections;
  chatbot.createCommand('omegle', /(^(?:[^ ])+) ?(.*)/, function(command, rest) {
    var that = this;
    if (!that.state) {
      that.state = new StateMachine([{
        'name': 'disconnected',
        'initial': true,
        'events': {
          'connect': 'connected'
        }
      }, {
        'name': 'connected',
        'events': {
          'disconnect': 'disconnected'
        }
      }]);
    }

    function bindOmegleWithChatbot() {
      if (that.omeglebotC) {
        that.send('There is already a current omegle connection! Close this one first.'); //Or use multi user o.o
        return false
      }
      that.omeglebotC = omeglebot();
      that.state.consumeEvent("connect");
      that.omeglebotC.event.on('out', function(message) {
        that.send('(omegle)' + message);
      });
      var c = that.eventualIO.connect();
      c.on('in', function(msg) {
        var message, user;
        if (typeof msg == 'string') {
          message = msg;
          user = null;
        }
        else {
          message = msg.message;
          user = msg.user;
        }
        if (message.indexOf('(omegle)') !== 0)
          that.omeglebotC.event.in((user ? '<' + user + '>' : '') + message);
      });

      that.omeglebotC.event.on('close', function() {
        c.close();
        that.state.consumeEvent("disconnect");
        that.omeglebotC = null;
      });
      return true
    }
    if (that.state.getStatus() == "connected") {
      switch (command) {
        case 'restart':
          that.omeglebotC.disconnect()
          if (bindOmegleWithChatbot()) {
            var regexResult = rest.match(/(?:(spy)(?: |$))?(?:lang=(.{2})(?: |$))?(.*)/);
            that.omeglebotC.startConversation(regexResult[1] == "spy", regexResult[2], regexResult[3] && regexResult[3].split(','));
          }
          break;
        case 'cap':

          that.omeglebotC.cap()

          break;

        case 'solve':

          that.omeglebotC.send(rest)

          break;

        case 'stop':
          that.omeglebotC.disconnect()
          break;
        default:
          this.send("The bot is currently connected, valid commands are: stop, solve, cap, restart")
      }
    }
    else if (that.state.getStatus() == "disconnected") {
      switch (command) {
        case 'restart':
        case 'start':
          if (bindOmegleWithChatbot()) {
            var regexResult = rest.match(/(?:(spy)(?: |$))?(?:lang=(.{2})(?: |$))?(.*)/);
            that.omeglebotC.startConversation(regexResult[1] == "spy", regexResult[2], regexResult[3] && regexResult[3].split(','));
          }
          break;
        case 'ask':
          if (bindOmegleWithChatbot()) {
            var regexResult = rest.match(/(?:(.*?))?(?:lang=(.{2}))?$/)
            that.omeglebotC.ask(regexResult[1], regexResult[2]);
          }
          break;
        default:
          this.send("The bot is currently disconnected, valid commands are: start, ask, restart")

      }
    }

  });


}

function multibotConnection() {

}

//I have no idea how it got so big; you don't have to read this if you don't want to...
//Giving input receiving output throgh events.
function eventualIO(ioHandler) {
  var that = this;
  this.connections = [];
  var eventTypes = ['out', 'err', 'close', 'connect', 'in'];
  eventTypes.forEach(function(event) {
    ioHandler[event] = function(d) {
      that.connections.forEach(function(each) {
        each.fire(event, d);
      });
    };
  });
  ioHandler.eventualIO = this;
  this.fire = function(event) { ioHandler[event]() }
  this.input = function(inp) {
    ioHandler.write(inp);
  };
}
eventualIO.prototype.connect = function() {
  var con = new eventualIOconnection(this, {})
  this.connections.push(con);
  return con;
};

function eventualIOconnection(parent, listeners) {
  this.connectionConstructor = parent;
  this.listeners = listeners;
}
eventualIOconnection.prototype.in = function(input) {
  this.connectionConstructor.input(input);
};
eventualIOconnection.prototype.on = function(event, callback) {
  if (!this.listeners[event]) this.listeners[event] = [callback];
  else this.listeners[event].push(callback);
  return function removeEventListener() {
    this.listeners[event].splice(this.listeners[event].indexOf(callback), 1);
  };
};
eventualIOconnection.prototype.fire = function(event, data) {
  this.listeners[event] && this.listeners[event].forEach(function(ev) {
    ev(data);
  })
}
eventualIOconnection.prototype.close = function() {
  this.fire("close");
  var splice = this.connectionConstructor.connections.indexOf(this);
  if (splice > -1)
    this.connectionConstructor.connections.splice(splice, 1);
  else console.warn("Close executed twice!?");
};

var chatbot = (function() {
  var commands = {},
    chatbotExport = {
      createCommand: createCommand,
      commands: commands,
      session: function() {
        return { write: function(query) { read(query, this) }, bot: chatbotExport, send: function(t) { write(t, this) } }
      }
    };

  function read(query, session) {
    var message;
    session.in && session.in(query);
    if (typeof query == 'string') {
      message = query;
      session.currentUser = null;
    }
    else {
      message = query.message;
      session.currentUser = query.user;
    }
    var parseResult = message.match(/^!([\w_-]+)/);

    if (parseResult && parseResult[1]) {
      var e;
      try {
        callCommand(parseResult[1], message.substring(parseResult[1].length + 2), session);
      }
      catch (e) {
        session.send("Error in command (" + message + "):" + e);
      }
    }
  }

  function write(a, session) {
    if (!(session && session.out)) {
      console.error('Output not set');
      return;
    }
    else session.out(a);
  }

  function callCommand(command, parameters, session) {
    var result,
      d = commands[command];
    if (d) {
      var regexResult = parameters.match(d.regex);
      if (regexResult) {
        return d.callback.apply(session, Array.prototype.slice.call(regexResult, 1));
      }
    }
  }

  function createCommand(command, regexpparameter, callback) {
    commands[command] = {
      regex: regexpparameter,
      callback: callback,
    };
  }

  return chatbotExport;
}());
var omegleBot = (function() {
  function write(t) {
    this.context.sendMessage(t)
  }
  var userConnection = require('./userConnection.js');
  var omegleConversation = { write: write, context: new userConnection(callback) }
  new eventualIO(omegleConversation);
  var captcha = null

  function captchad(user, challenge) {
    say("I've been captcha'd! Cannot connect to omegle anymore! :(");
    captcha = (new(require('./captchaDialog.js'))(challenge, user.id));
  }

  function say(t) { omegleConversation.out(t) }

  function callback(event, b) {
    if (event == "close") {
      omegleConversation.close()
    }
    else if (event == "error") {
      say("Error: " + b);
    }
    else if (event == "serverMessage") {
      say("Server: " + b);
    }
    else if (event == "captcha") {
      captchad(omegleConversation.context, b);
    }
    else if (event == "ban") {
      say("I've been banned from omegle, server response: " + b);
      omegleConversation.close();
    }
    else if (event == "connected" && b === null) { say("Stranger has connected" + (omegleConversation.context.question ? ", question: " + omegleConversation.context.question : ".")) }
    else if (event === "message") { say("Stranger:" + b) }
    else if (event == "spyMessage") { say(b[0] + ":" + b[1]) }
    else if (event == "spyDisconnected") {
      say(b[0] + " has disconnected.");
      omegleConversation.close()
    }
    else if (event == "disconnected") { say("Stranger has disconnected."); }
    else { console.log(arguments) }
  }

  function disconnect() {
    say("You have disconnected.");
    omegleConversation.context.sendAction("disconnect");
  }

  function startConversation(spy, lang, interests) {
    if (captcha) { return null }
    omegleConversation.context.questionMode = spy;
    lang && (omegleConversation.context.lang = lang)
    omegleConversation.context.topics = undefined;
    interests && (omegleConversation.context.topics = JSON.stringify(interests))
    omegleConversation.context.init();
  }

  function ask(question, lang) {
    if (captcha) { return null }
    lang && (omegleConversation.context.lang = lang)
    omegleConversation.context.ask = question
    omegleConversation.context.init();
  }

  function cap() {
    if (captcha) {
      if (!omegleConversation) { captcha = null; return }
      captcha.update().then(function() {
        say("captcha is :" + captcha.getImageUrl());
      })
    }
    else if (omegleConversation) {
      say("There is no captcha to solve");
    }
  }

  function send(secret) {
    if (captcha) captcha.send(secret).then(function(b) {
      if (!b) { say("incorrect captcha!") }
    });
  }




  return { startConversation: startConversation, disconnect: disconnect, cap: cap, send: send, ask: ask, event: omegleConversation.eventualIO.connect() };
})

workshopBot(chatbot, omegleBot);


function initializing() {


  //"connecting" to the chatbot
  var ircChatbotConnection = new eventualIO(chatbot.session()).connect();
  //on output direct to console.log (the console)
  ircChatbotConnection.on('out', console.log.bind(console));
  var irc = require('irc');
  var client = new irc.Client('irc.canternet.org', 'RainBot', {
    channels: ['#rgb'],
  });
  ircChatbotConnection.on('out', function(msg) { client.say("#rgb", msg) });

  client.addListener('message', function(from, to, message) {
    ircChatbotConnection.in({ message: message, user: from });
  });
  client.addListener('error', function(message) {
    console.log('error: ', message);
  });

  var login = require("facebook-chat-api");

  // Create simple echo bot 
  login({
    email: credentials.fbemail,
    password: credentials.fbpassword
  }, (err, api) => {


    if (err) {
      console.error(err, "IT HAS ERRORED");
      return;
    }
    api.setOptions({
      selfListen: true
    })
    var threads = {}

    function getNicks(threadId) {
      if (threads[threadId] && threads[threadId].nicks) {
        return Promise.resolve(threads[threadId].nicks);
      }
      else {
        return new Promise(function(resolve) {
          api.getThreadInfo(threadId, function(gfdfg, b) {
            resolve(threads[threadId].nicks = b.nicknames || {});
          })
        })
      }
    }

    function getNick(id, threadId) {
      return getNicks(threadId).then(function(nicks) {
        if (nicks[id]) return nicks[id];
        else return new Promise(function(resolve) {
          api.getUserInfo(id, function(err, result) {
            resolve(nicks[id] = result[id].vanity || result[id].firstName)
          })
        })
      })
    }
    api.listen((err, message) => {
   
      if (err) return console.error("ERROR", err)
      var chatbot2;
      if (!threads[message.threadID]) {
        threads[message.threadID] = {
          chatbot: new eventualIO(chatbot.session()).connect()
        }
        threads[message.threadID].chatbot.on('out', function(msg) {
          api.sendMessage(msg, message.threadID);
        })
      }
      chatbot2 = threads[message.threadID].chatbot;

      if (message && message.body) {
        getNick(message.senderID, message.threadID).then(function(user) {
          chatbot2.in({
            message: message.body,
            user: user
          })
        })
      }
    })
  })
  var Discord = require("discord.io")
  var DiscordchatbotConnection = new eventualIO(chatbot).connect();
  var bot = new Discord.Client({
    token: credentials.discordtoken,
    autorun: true
  });

  bot.on('ready', function() {
    console.log('Logged in as %s - %s\n', bot.username, bot.id);
  });

  DiscordchatbotConnection.on("out", function(msg) {


  })
  var discordChannels = {}
  bot.on('message', function(user, userID, channelID, message, event) {
    //console.log(user,userID,channelID,message)
    if (!discordChannels[channelID]) {
      discordChannels[channelID] = {
        chatbot: new eventualIO(chatbot.session()).connect()
      }
      discordChannels[channelID].chatbot.on('out', function(msg) {
        bot.sendMessage({ to: channelID, message: msg })
      })
    }

    //console.log("THIS WAS EXECUTED2")
    discordChannels[channelID].chatbot.in({ message: message, user: user })

  });
  //discord2 = bot;
}
initializing();
