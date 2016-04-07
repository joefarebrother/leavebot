// ==UserScript==
// @name         leavebot for robbin
// @namespaaace  http://tampermonkey.net/
// @version      2.2.3
// @description  Seed and leave smaller tiers
// @author       u/robin-leave-bot
// @include      https://www.reddit.com/robin*
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @updateURL    https://raw.githubusercontent.com/joefarebrother/leavebot/master/leavebot.user.js
// @grant   GM_getValue
// @grant   GM_setValue
// @grant   GM_xmlhttpRequest
// ==/UserScript==

(function (){
	
	var botList = JSON.parse(localStorage.getItem("leavebot-botList")) || {};

	function savebotList () {
		localStorage.setItem("leavebot-botList", JSON.stringify(botList));
	}
	function clearbotList () {
		localStorage.setItem("leavebot-botList", "{}");
		botList = {};
	}

	function sendMessage (msg, overridePrefix) {
		if($("#robinSendMessage > input[type='text']").val().trim() !== ""){
			if(overridePrefix){
				setTimeout(function() {sendMessage(msg);}, 1000);
			}
			return;
		}
		var prefix = overridePrefix ? "" : "%leavebot ";
		$("#robinSendMessage > input[type='text']").val(prefix + msg);
    	$("#robinSendMessage > input[type='submit']").click();
	}

	function leave (reason) {
		console.log(reason);
		sendMessage("Bye, leaving to seed smaller tiers!");
		sendMessage("/leave_room", true);
	}

	var sizeThreshold = 10, lastStatisticsUpdate = Math.floor(Date.now()/1000), users = 0, userList = [];
	function update () {
		//Code mostly stolen from Parrot

		$(".robin-chat--vote.robin--vote-class--increase:not('.robin--active')").click();

		var currentUsers = 0;
        $.get("/robin/", function(a) {
            var START_TOKEN = "<script type=\"text/javascript\" id=\"config\">r.setup(";
            var END_TOKEN = ")</script>";
            var start = a.substring(a.indexOf(START_TOKEN)+START_TOKEN.length);
            var end = start.substring(0,start.indexOf(END_TOKEN));
            var config = JSON.parse(end);
            var list = config.robin_user_list;

            userList = [];

            var counts = list.reduce(function(counts, voter) {
                counts[voter.vote] += 1;
                if(voter.vote !== "INCREASE" && voter.vote !=="NOVOTE"){ //Can't be a leavebot if it's not autogrowing
                	botList[voter.name] = "no";
                }
                userList.push(voter.name);

                return counts;
            }, {
                INCREASE: 0,
                ABANDON: 0,
                NOVOTE: 0,
                CONTINUE: 0
            });

            currentUsers = users = list.length;

            var currentTime = Math.floor(Date.now()/1000);

            if((counts.INCREASE) * 2 + counts.NOVOTE <= users){
            	leave("Too many stayers");
            }

            if((currentTime-lastStatisticsUpdate)>=60)
            {
                lastStatisticsUpdate = currentTime;

                // Report statistics to the automated leaderboard
                trackers = [
                    "https://monstrouspeace.com/robintracker/track.php"
                ];

                queryString = "?id=" + config.robin_room_name.substr(0,10) +
                    "&guid=" + config.robin_room_id +
                    "&ab=" + counts.ABANDON +
                    "&st=" + counts.CONTINUE +
                    "&gr=" + counts.INCREASE +
                    "&nv=" + counts.NOVOTE +
                    "&count=" + users +
                    "&ft=" + Math.floor(config.robin_room_date / 1000) +
                    "&rt=" + Math.floor(config.robin_room_reap_time / 1000);

                trackers.forEach(function(tracker){
                    $.get(tracker + queryString);
                });
            }
        });

        var lastChatString = $(".robin-message--timestamp").last().attr("datetime");
        var timeSinceLastChat = new Date() - (new Date(lastChatString));
        var now = new Date();
        if (timeSinceLastChat !== undefined && (timeSinceLastChat > 600000 && now - timeStarted > 600000)) {
            window.location.reload(); // reload if we haven't seen any activity in a minute.
        }

        // Try to join if not currently in a chat
        if ($("#joinRobinContainer").length) {
        	clearbotList();
            $("#joinRobinContainer").click();
            setTimeout(function() {
                $("#joinRobin").click();
            }, 1000);
        }

        $(".robin-message").each(function(idx, message) {
			var name = $(message).find(".robin-message--from").text().trim();
			var text = $(message).find(".robin-message--message").text().trim();

			if(name === ""){return;}

			if(text.startsWith("%leavebot")){
				botList[name] = "yes";
				if ($(".user a").text() !== "robin-leave-bot") { // So I can debug this
					$(message).hide(); //Users of this script will be filtered from this script's spam
				}
			}
			else if(!botList[name]){
				botList[name] = "no";
			}
			$(message).removeClass(".robin-message"); //So it's not selected in future
		});

        var botcount = 0;
        $.each(botList, function(name, isbot) {
        	if(userList.indexOf(name) === -1 && userList.length !== 0){
        		delete botList[name];
        		return;
        	}
        	if(isbot === "yes"){botcount++;}
        });

        if(botcount > users - botcount + 1 && users > 2 && Math.random() < botcount/users - 0.6){
        	leave("Bots outnumber users");
        }
        if(users > sizeThreshold){
        	leave("Over size threshold");
        }
        if(users == 1){
        	leave("Alone");
        }

        savebotList();
	}

	//Advertise in the chat to convince users to install or leave
	var messages = 
	["I am a bot designed to grow up smaller tiers, then leave",
	"More info in this reddit comment: https://www.reddit.com/r/robintracking/comments/4desi0/tier_15_ccandeshle/d1rf3j7",
	"Please consider installing my script at https://github.com/joefarebrother/leavebot",
	"Or a quieter fork, https://github.com/nzchicken/leavebot",
	"PM u/robin-leave-bot on reddit if there's a bug",
    "I'll be gone in a few merges, so you can get back to chatting",
	"Thank you for your patience"];

	var messageIdx = 0;
	var adInterval;

	function advertise() {
		if (messageIdx >= messages.length){
			clearInterval(adInterval);
		}
		else{
			sendMessage(messages[messageIdx++]);
		}
	}

    if (GM_info.isIncognito) {
	   update();
	   setInterval(update, 30000);
	   adInterval = setInterval(advertise, 10000 + Math.random() * 5000 - 1000); 
    }
})();