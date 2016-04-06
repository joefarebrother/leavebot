// ==UserScript==
// @name         leavebot for robbin
// @namespaaace  http://tampermonkey.net/
// @version      1.0
// @description  Seed and leave smaller tiers
// @author       u/robin-leave-bot
// @include      https://www.reddit.com/robin*
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @updateURL    https://raw.githubusercontent.com/joefarebrother/leavebot/master/leavebot.js
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
		var prefix = overridePrefix ? "" : "%leavebot ";
		$("#robinSendMessage > input[type='text']").val(prefix + msg);
    	$("#robinSendMessage > input[type='submit']").click();
	}

	function leave () {
		sendMessage("Bye, leaving to seed smaller tiers!");
		sendMessage("/leave_room", true);
	}

	var sizeThreshold = 20, lastStatisticsUpdate = Math.floor(Date.now()/1000);
	function update () {
		//Code mostly stolen from Parrot

		$(".robin-chat--vote.robin--vote-class--increase:not('.robin--active')").click();

		var users = 0;
        $.get("/robin/", function(a) {
            var START_TOKEN = "<script type=\"text/javascript\" id=\"config\">r.setup(";
            var END_TOKEN = ")</script>";
            var start = a.substring(a.indexOf(START_TOKEN)+START_TOKEN.length);
            var end = start.substring(0,start.indexOf(END_TOKEN));
            var config = JSON.parse(end);
            var list = config.robin_user_list;


            var counts = list.reduce(function(counts, voter) {
                counts[voter.vote] += 1;
                if(voter.vote !== "INCREASE"){ //Can't be a leavebot if it's not autogrowing
                	botList[voter.name] = "no";
                }
                return counts;
            }, {
                INCREASE: 0,
                ABANDON: 0,
                NOVOTE: 0,
                CONTINUE: 0
            });

            users = list.length;
            var currentTime = Math.floor(Date.now()/1000);

            if(counts.INCREASE * 2 < users){
            	leave();
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
            $("#joinRobinContainer").click();
            setTimeout(function() {
                $("#joinRobin").click();
            }, 1000);
        }

        $(".robin-message").each(function(message) {
			var name = $(message).find(".robin-message--from robin--username").text().trim();
			var text = $(message).find(".robin-message--message").text().trim();

			if(text.startsWith("%leavebot") && !botList[name]){
				botList[name] = "yes";
				if ($(".user a").text() !== "robin-leave-bot") { // So I can debug this
					$(message).hide(); //Users of this script will be filtered from this script's spam
				}
			}
			else{
				botList[name] = "no";
			}
			$(message).removeClass(".robin-message"); //So it's not selected in future
		});

        var botcount = 0;
        $.each(botList, function(name, isbot) {
        	if(isbot === "yes"){botcount++;}
        });

        if(botcount > users - botcount + 1 && users > 2 && Math.random() < botcount/users - 0.6){
        	leave();
        }
        if(users > sizeThreshold){
        	leave();
        }

        savebotList();
	}

	//"Spam" the chat to convince users to install or leave
	var messages = 
	["I am a bot designed to grow small up smaller tiers, then leave",
	"More info in this reddit comment: https://www.reddit.com/r/robintracking/comments/4desi0/tier_15_ccandeshle/d1rf3j7",
	"Please consider installing my script at https://github.com/joefarebrother/leavebot/blob/master/leavebot.js",
	"If you install my script, it will filter out my spam, so you can still chat",
	"PM u/robin-leave-bot on reddit if there's a bug"];

	var messageIdx = 0;

	function spam() {
		sendMessage(messages[messageIdx++ % messages.length]);
	}

	update();
	setInterval(update, 30000);
	setInterval(spam, 10000 + Math.random() * 5000 - 1000); //Have some randomness as not to collide with other leavebots

})();